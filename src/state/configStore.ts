import { create } from 'zustand';
import { parseIni, type IniSection } from '../parser/iniParser';
import { serialManager } from '../serial/serialManager';
import { validateMediaReference } from '../config/mediaCatalog';
import { buildBladeInIni, buildBladeOutIni, normalizeConfig } from '../config/normalizeConfig';
import type { BladeStyleConfig, ConfigBank, ConfigDocument, PresetConfig } from '../config/types';

const BLADE_PARAM_KEY = /^blade(\d+)_(.+)$/i;
const SAVE_STATUS_RESET_DELAY_MS = 3000;

type SaveStatus = 'idle' | 'saving' | 'rebooting' | 'success' | 'error';

interface ConfigState {
  sections: IniSection[];
  doc: ConfigDocument | null;
  isConnected: boolean;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
  saveStatus: SaveStatus;
  logs: string[];
  activeBank: ConfigBank;
  activePresetIndex: number;
  activeBladeIndex: number;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  loadFromBoard: () => Promise<void>;
  loadSample: () => void;
  saveToBoard: () => Promise<void>;
  updateParam: (sectionIndex: number, key: string, value: string) => void;
  setActiveBank: (bank: ConfigBank) => void;
  setActivePresetIndex: (index: number) => void;
  setActiveBladeIndex: (index: number) => void;
  addPreset: () => void;
  reorderPreset: (from: number, to: number) => void;
  deletePreset: (index: number) => void;
  updateBladeParam: (presetIndex: number, bladeIndex: number, key: string, value: string) => void;
  addLog: (msg: string) => void;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
};

const clampIndex = (index: number, maxIndex: number): number => {
  if (maxIndex < 0) return 0;
  if (index < 0) return 0;
  if (index > maxIndex) return maxIndex;
  return index;
};

const getBankPresets = (doc: ConfigDocument, bank: ConfigBank): PresetConfig[] => {
  return doc.banks[bank].presets;
};

const updateDocBankPresets = (
  doc: ConfigDocument,
  bank: ConfigBank,
  presets: PresetConfig[]
): ConfigDocument => {
  if (bank === 'blade_in') {
    return {
      ...doc,
      banks: {
        ...doc.banks,
        blade_in: {
          ...doc.banks.blade_in,
          presets,
        },
      },
    };
  }

  return {
    ...doc,
    banks: {
      ...doc.banks,
      blade_out: {
        ...doc.banks.blade_out,
        presets,
      },
    },
  };
};

const buildSectionsForBank = (doc: ConfigDocument, bank: ConfigBank): IniSection[] => {
  const ini = bank === 'blade_in' ? buildBladeInIni(doc) : buildBladeOutIni(doc);
  return parseIni(ini);
};

const cloneBlade = (blade: BladeStyleConfig): BladeStyleConfig => ({
  style: blade.style,
  params: { ...blade.params },
});

const ensureBladeAtIndex = (blades: BladeStyleConfig[], bladeIndex: number): BladeStyleConfig[] => {
  const next = blades.map(cloneBlade);
  while (next.length <= bladeIndex) {
    next.push({ style: 'standard', params: {} });
  }
  return next;
};

const createDefaultPreset = (numBlades: number): PresetConfig => ({
  name: 'New Preset',
  font: 'font1',
  track: 'tracks/track1.wav',
  blades: Array.from({ length: Math.max(1, numBlades) }, () => ({
    style: 'standard',
    params: {
      base_color: 'Blue',
      alt_color: 'Cyan',
    },
  })),
});

const isPresetSection = (section: IniSection | undefined): boolean =>
  Boolean(section && section.name.toLowerCase().startsWith('preset'));

const resolvePresetIndexFromSectionIndex = (sections: IniSection[], sectionIndex: number): number => {
  if (!isPresetSection(sections[sectionIndex])) {
    return -1;
  }

  let presetIndex = -1;
  for (let index = 0; index <= sectionIndex; index += 1) {
    if (isPresetSection(sections[index])) {
      presetIndex += 1;
    }
  }
  return presetIndex;
};

const resolveSectionIndexFromPresetIndex = (sections: IniSection[], presetIndex: number): number => {
  if (presetIndex < 0) return -1;

  let resolvedPresetIndex = -1;
  for (let index = 0; index < sections.length; index += 1) {
    if (isPresetSection(sections[index])) {
      resolvedPresetIndex += 1;
      if (resolvedPresetIndex === presetIndex) {
        return index;
      }
    }
  }

  return -1;
};

const updateDocSharedValue = (
  doc: ConfigDocument,
  sectionName: string,
  key: string,
  value: string
): ConfigDocument | null => {
  const normalizedSectionName = sectionName.toLowerCase();

  if (normalizedSectionName === 'global') {
    return {
      ...doc,
      shared: {
        ...doc.shared,
        global: {
          ...doc.shared.global,
          [key]: value,
        },
      },
    };
  }

  if (normalizedSectionName === 'buttons_on') {
    return {
      ...doc,
      shared: {
        ...doc.shared,
        buttonsOn: {
          ...doc.shared.buttonsOn,
          [key]: value,
        },
      },
    };
  }

  if (normalizedSectionName === 'buttons_off') {
    return {
      ...doc,
      shared: {
        ...doc.shared,
        buttonsOff: {
          ...doc.shared.buttonsOff,
          [key]: value,
        },
      },
    };
  }

  return null;
};

const scheduleSaveStatusReset = (setState: (state: Partial<ConfigState>) => void): void => {
  setTimeout(() => setState({ saveStatus: 'idle' }), SAVE_STATUS_RESET_DELAY_MS);
};

const parseBladeParamKey = (key: string): { bladeIndex: number; field: string } | null => {
  const match = key.match(BLADE_PARAM_KEY);
  if (!match) return null;

  const bladeIndex = Number.parseInt(match[1], 10) - 1;
  if (bladeIndex < 0 || Number.isNaN(bladeIndex)) return null;

  return { bladeIndex, field: match[2] };
};

const syncPresetValue = (
  preset: PresetConfig,
  activeBladeIndex: number,
  key: string,
  value: string
): PresetConfig => {
  if (key === 'name' || key === 'font' || key === 'track') {
    return { ...preset, [key]: value };
  }

  const parsedBladeParam = parseBladeParamKey(key);
  if (parsedBladeParam) {
    const blades = ensureBladeAtIndex(preset.blades, parsedBladeParam.bladeIndex);
    const blade = blades[parsedBladeParam.bladeIndex];
    blades[parsedBladeParam.bladeIndex] =
      parsedBladeParam.field.toLowerCase() === 'style'
        ? { ...blade, style: value }
        : { ...blade, params: { ...blade.params, [parsedBladeParam.field]: value } };
    return { ...preset, blades };
  }

  const bladeIndex = clampIndex(activeBladeIndex, Math.max(0, preset.blades.length - 1));
  const blades = ensureBladeAtIndex(preset.blades, bladeIndex);
  const blade = blades[bladeIndex];
  blades[bladeIndex] = { ...blade, params: { ...blade.params, [key]: value } };
  return { ...preset, blades };
};

const findMissingMediaReferences = async (doc: ConfigDocument): Promise<string[]> => {
  const missing = new Set<string>();
  const fonts = await serialManager.listFonts();
  const tracksByFont = new Map<string, string[]>();

  for (const bank of ['blade_in', 'blade_out'] as const) {
    for (const preset of doc.banks[bank].presets) {
      const font = preset.font.trim();
      if (validateMediaReference(font, fonts) === 'missing') {
        missing.add(`font "${font || '(empty)'}"`);
        continue;
      }

      const normalizedFont = font.toLowerCase();
      let tracks = tracksByFont.get(normalizedFont);
      if (!tracks) {
        tracks = await serialManager.listTracks(font);
        tracksByFont.set(normalizedFont, tracks);
      }

      if (validateMediaReference(preset.track, tracks) === 'missing') {
        missing.add(`track "${preset.track}" for font "${font}"`);
      }
    }
  }

  return Array.from(missing);
};

const SAMPLE_INI = `[Global]
Volume=1500
ClashThreshold=2.5
GestureFlags=0

[preset]
name=Kestis
font=Kestis/
track=tracks/kestis.wav
style=standard
base_color=Blue
alt_color=Cyan
blast_color=White
clash_color=White
lockup_color=White
ignition_time=300
retraction_time=800
flicker_depth=12000
flicker_speed=1000

[preset]
name=Vader
font=Vader/
track=tracks/vader.wav
style=unstable
base_color=Red
alt_color=White
blast_color=White
clash_color=White
lockup_color=White
ignition_time=300
retraction_time=800
flicker_depth=16000
flicker_speed=1500

[buttons_off]
slot_0=on_or_volume_up
slot_1=track_player
slot_2=prev_preset_if_not_volume_menu
slot_24=activate_muted
slot_5=next_preset_or_volume_down
slot_6=toggle_volume_menu
slot_8=battery_level

[buttons_on]
slot_23=off
slot_4=force
slot_24=lightning_block
slot_26=toggle_battle_mode
slot_5=blast
slot_7=lockup_or_drag
slot_9=blast
slot_27=toggle_multi_blast
slot_28=blast
slot_12=color_change
slot_31=melt
`;

export const useConfigStore = create<ConfigState>((set, get) => ({
  sections: [],
  doc: null,
  isConnected: false,
  isDirty: false,
  isLoading: false,
  error: null,
  saveStatus: 'idle',
  logs: [],
  activeBank: 'blade_in',
  activePresetIndex: 0,
  activeBladeIndex: 0,

  connect: async () => {
    try {
      set({ isLoading: true, error: null });
      await serialManager.connect();
      console.log('Serial connected successfully');
      set({ isConnected: true, isLoading: false });

      setTimeout(async () => {
        const { loadFromBoard } = get();
        await loadFromBoard();
      }, 500);
    } catch (error: unknown) {
      console.error('Connection error:', error);
      set({ error: getErrorMessage(error), isLoading: false, isConnected: false });
    }
  },

  disconnect: async () => {
    await serialManager.disconnect();
    set({ isConnected: false });
  },

  loadSample: () => {
    const parsed = parseIni(SAMPLE_INI);
    const doc = normalizeConfig({
      bladeInIni: SAMPLE_INI,
      bladeOutIni: SAMPLE_INI,
      hwProfile: { numBlades: 1, numButtons: 1, hasBladeDetect: false },
    });
    set({
      sections: parsed,
      doc,
      isDirty: false,
      error: null,
      activeBank: 'blade_in',
      activePresetIndex: 0,
      activeBladeIndex: 0,
    });
  },

  loadFromBoard: async () => {
    try {
      set({ isLoading: true, error: null });
      const hwProfile = await serialManager.getHardwareProfile();
      const bladeInIni = await serialManager.readIniBank('blade_in');
      const bladeOutIni = await serialManager.readIniBank('blade_out');

      if (!bladeInIni && !bladeOutIni) {
        throw new Error('No data received from board');
      }

      const doc = normalizeConfig({
        bladeInIni: bladeInIni || '',
        bladeOutIni: bladeOutIni || '',
        hwProfile,
      });

      const activeBank = get().activeBank;
      const maxPresetIndex = Math.max(0, getBankPresets(doc, activeBank).length - 1);
      const maxBladeIndex = Math.max(0, doc.hardwareProfile.numBlades - 1);

      set({
        sections: buildSectionsForBank(doc, activeBank),
        doc,
        isDirty: false,
        isLoading: false,
        activePresetIndex: clampIndex(get().activePresetIndex, maxPresetIndex),
        activeBladeIndex: clampIndex(get().activeBladeIndex, maxBladeIndex),
      });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false });
    }
  },

  saveToBoard: async () => {
    try {
      const { isConnected, doc, activeBank, activePresetIndex, activeBladeIndex } = get();
      if (!isConnected) throw new Error('Please connect to board before saving');
      if (!doc) throw new Error('No configuration loaded');

      set({ isLoading: true, saveStatus: 'saving', error: null });

      const missingMedia = await findMissingMediaReferences(doc);
      if (missingMedia.length > 0) {
        set({
          error: `Cannot save: missing media references (${missingMedia.join(', ')})`,
          isLoading: false,
          saveStatus: 'error',
        });
        scheduleSaveStatusReset(set);
        return;
      }

      const bladeInIni = buildBladeInIni(doc);
      const bladeOutIni = buildBladeOutIni(doc);
      console.log('Sending banked INI to board...');
      const bladeInSaved = await serialManager.writeIniBank('blade_in', bladeInIni);
      const bladeOutSaved = await serialManager.writeIniBank('blade_out', bladeOutIni);

      if (bladeInSaved && bladeOutSaved) {
        set({ saveStatus: 'rebooting', error: null });
        await serialManager.reconnectAfterReset();

        const hwProfile = await serialManager.getHardwareProfile();
        const syncedBladeIn = await serialManager.readIniBank('blade_in');
        const syncedBladeOut = await serialManager.readIniBank('blade_out');

        if (!syncedBladeIn && !syncedBladeOut) {
          throw new Error('Board rebooted, but no configuration data was returned');
        }

        const syncedDoc = normalizeConfig({
          bladeInIni: syncedBladeIn || bladeInIni,
          bladeOutIni: syncedBladeOut || bladeOutIni,
          hwProfile,
        });

        const maxPresetIndex = Math.max(0, getBankPresets(syncedDoc, activeBank).length - 1);
        const maxBladeIndex = Math.max(0, syncedDoc.hardwareProfile.numBlades - 1);

        set({
          sections: buildSectionsForBank(syncedDoc, activeBank),
          doc: syncedDoc,
          isDirty: false,
          isLoading: false,
          saveStatus: 'success',
          isConnected: true,
          activePresetIndex: clampIndex(activePresetIndex, maxPresetIndex),
          activeBladeIndex: clampIndex(activeBladeIndex, maxBladeIndex),
        });
        console.log('Save sequence finished successfully and board re-synced');
        scheduleSaveStatusReset(set);
      } else {
        set({
          error: 'Board failed to confirm save. Check SD card and serial connection.',
          isLoading: false,
          saveStatus: 'error',
        });
        scheduleSaveStatusReset(set);
      }
    } catch (error: unknown) {
      console.error('Final Save Error:', error);
      set({ error: getErrorMessage(error), isLoading: false, saveStatus: 'error', isConnected: false });
      scheduleSaveStatusReset(set);
    }
  },

  updateParam: (sectionIndex, key, value) => {
    set((state) => {
      const newSections = [...state.sections];
      if (!newSections[sectionIndex]) {
        return {};
      }

      newSections[sectionIndex] = {
        ...newSections[sectionIndex],
        params: { ...newSections[sectionIndex].params, [key]: value },
      };

      if (!state.doc) {
        return { sections: newSections, isDirty: true };
      }

      const presetIndex = resolvePresetIndexFromSectionIndex(newSections, sectionIndex);
      if (presetIndex < 0) {
        const sharedDoc = updateDocSharedValue(state.doc, newSections[sectionIndex].name, key, value);
        if (sharedDoc) {
          return {
            sections: newSections,
            doc: sharedDoc,
            isDirty: true,
          };
        }
        return { sections: newSections, isDirty: true };
      }

      const presets = [...getBankPresets(state.doc, state.activeBank)];
      if (!presets[presetIndex]) {
        return { sections: newSections, isDirty: true };
      }

      presets[presetIndex] = syncPresetValue(
        presets[presetIndex],
        state.activeBladeIndex,
        key,
        value
      );

      return {
        sections: newSections,
        doc: updateDocBankPresets(state.doc, state.activeBank, presets),
        isDirty: true,
      };
    });
  },

  setActiveBank: (bank) => {
    set((state) => {
      if (!state.doc) {
        return { activeBank: bank };
      }

      const maxPresetIndex = Math.max(0, getBankPresets(state.doc, bank).length - 1);
      return {
        sections: buildSectionsForBank(state.doc, bank),
        activeBank: bank,
        activePresetIndex: clampIndex(state.activePresetIndex, maxPresetIndex),
      };
    });
  },

  setActivePresetIndex: (index) => {
    set((state) => {
      if (!state.doc) {
        return { activePresetIndex: Math.max(0, index) };
      }
      const maxPresetIndex = Math.max(0, getBankPresets(state.doc, state.activeBank).length - 1);
      return { activePresetIndex: clampIndex(index, maxPresetIndex) };
    });
  },

  setActiveBladeIndex: (index) => {
    set((state) => {
      const maxBladeIndex = Math.max(0, (state.doc?.hardwareProfile.numBlades ?? 1) - 1);
      return { activeBladeIndex: clampIndex(index, maxBladeIndex) };
    });
  },

  addPreset: () => {
    set((state) => {
      const sections = [
        ...state.sections,
        {
          name: 'preset',
          params: {
            name: 'New Preset',
            font: 'font1',
            track: 'tracks/track1.wav',
            base_color: 'Blue',
            alt_color: 'Cyan',
            style: 'standard',
          },
        },
      ];

      if (!state.doc) {
        return { sections, isDirty: true };
      }

      const presets = [...getBankPresets(state.doc, state.activeBank)];
      presets.push(createDefaultPreset(state.doc.hardwareProfile.numBlades));

      return {
        sections,
        doc: updateDocBankPresets(state.doc, state.activeBank, presets),
        isDirty: true,
        activePresetIndex: presets.length - 1,
      };
    });
  },

  reorderPreset: (from, to) => {
    set((state) => {
      if (!state.doc) {
        return {};
      }

      const presets = [...getBankPresets(state.doc, state.activeBank)];
      const maxIndex = presets.length - 1;
      if (
        from < 0 ||
        to < 0 ||
        from > maxIndex ||
        to > maxIndex ||
        from === to
      ) {
        return {};
      }

      const [moved] = presets.splice(from, 1);
      presets.splice(to, 0, moved);

      let activePresetIndex = state.activePresetIndex;
      if (state.activePresetIndex === from) {
        activePresetIndex = to;
      } else if (from < state.activePresetIndex && to >= state.activePresetIndex) {
        activePresetIndex -= 1;
      } else if (from > state.activePresetIndex && to <= state.activePresetIndex) {
        activePresetIndex += 1;
      }

      return {
        doc: updateDocBankPresets(state.doc, state.activeBank, presets),
        isDirty: true,
        activePresetIndex: clampIndex(activePresetIndex, presets.length - 1),
      };
    });
  },

  deletePreset: (index) => {
    set((state) => {
      if (!state.doc) {
        return {};
      }

      const presets = [...getBankPresets(state.doc, state.activeBank)];
      if (index < 0 || index >= presets.length) {
        return {};
      }

      presets.splice(index, 1);

      let activePresetIndex = state.activePresetIndex;
      if (presets.length === 0) {
        activePresetIndex = 0;
      } else if (state.activePresetIndex > index) {
        activePresetIndex = state.activePresetIndex - 1;
      } else if (state.activePresetIndex === index) {
        activePresetIndex = Math.max(0, Math.min(index - 1, presets.length - 1));
      }

      return {
        doc: updateDocBankPresets(state.doc, state.activeBank, presets),
        isDirty: true,
        activePresetIndex,
      };
    });
  },

  updateBladeParam: (presetIndex, bladeIndex, key, value) => {
    set((state) => {
      if (!state.doc) {
        return {};
      }

      const presets = [...getBankPresets(state.doc, state.activeBank)];
      const preset = presets[presetIndex];
      if (!preset || bladeIndex < 0) {
        return {};
      }

      const blades = ensureBladeAtIndex(preset.blades, bladeIndex);
      const blade = blades[bladeIndex];
      blades[bladeIndex] =
        key.toLowerCase() === 'style'
          ? { ...blade, style: value }
          : { ...blade, params: { ...blade.params, [key]: value } };

      presets[presetIndex] = {
        ...preset,
        blades,
      };

      const newSections = [...state.sections];
      const sectionIndex = resolveSectionIndexFromPresetIndex(newSections, presetIndex);
      if (sectionIndex >= 0 && newSections[sectionIndex]) {
        const sectionKey = `blade${bladeIndex + 1}_${key}`;
        newSections[sectionIndex] = {
          ...newSections[sectionIndex],
          params: {
            ...newSections[sectionIndex].params,
            [sectionKey]: value,
          },
        };
      }

      return {
        sections: newSections,
        doc: updateDocBankPresets(state.doc, state.activeBank, presets),
        isDirty: true,
      };
    });
  },

  addLog: (msg) => {
    set((state) => ({
      logs: [...state.logs.slice(-49), msg],
    }));
  },
}));

declare global {
  interface Window {
    useConfigStore?: typeof useConfigStore;
  }
}

if (typeof window !== 'undefined') {
  window.useConfigStore = useConfigStore;
}
