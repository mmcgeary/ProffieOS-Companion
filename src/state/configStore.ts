import { create } from 'zustand';
import { parseIni, generateIni, type IniSection } from '../parser/iniParser';
import { serialManager } from '../serial/serialManager';

interface ConfigState {
  sections: IniSection[];
  isConnected: boolean;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  logs: string[];
  activePresetIndex: number;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  loadFromBoard: () => Promise<void>;
  loadSample: () => void;
  saveToBoard: () => Promise<void>;
  updateParam: (sectionIndex: number, key: string, value: string) => void;
  setActivePresetIndex: (index: number) => void;
  addPreset: () => void;
  addLog: (msg: string) => void;
}

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
  isConnected: false,
  isDirty: false,
  isLoading: false,
  error: null,
  saveStatus: 'idle',
  logs: [],
  activePresetIndex: 0,

  connect: async () => {
    try {
      set({ isLoading: true, error: null });
      await serialManager.connect();
      console.log('Serial connected successfully');
      set({ isConnected: true, isLoading: false });
      
      // Sync from board after short delay for stability
      setTimeout(async () => {
        const { loadFromBoard } = get();
        await loadFromBoard();
      }, 500);
    } catch (err: any) {
      console.error('Connection error:', err);
      set({ error: err.message, isLoading: false, isConnected: false });
    }
  },

  disconnect: async () => {
    await serialManager.disconnect();
    set({ isConnected: false });
  },

  loadSample: () => {
    const parsed = parseIni(SAMPLE_INI);
    set({ sections: parsed, isDirty: false, error: null });
  },

  loadFromBoard: async () => {
    try {
      set({ isLoading: true, error: null });
      const rawData = await serialManager.readConfig();
      if (!rawData) throw new Error('No data received from board');
      const parsed = parseIni(rawData);
      set({ sections: parsed, isDirty: false, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  saveToBoard: async () => {
    try {
      const { isConnected, sections } = get();
      if (!isConnected) throw new Error('Please connect to board before saving');

      set({ isLoading: true, saveStatus: 'saving', error: null });

      const rawData = generateIni(sections);
      console.log('Sending INI to board...');
      const success = await serialManager.writeConfig(rawData);

      if (success) {
        set({ isDirty: false, isLoading: false, saveStatus: 'success' });
        console.log('Save sequence finished successfully');
        setTimeout(() => set({ saveStatus: 'idle' }), 3000);
      } else {
        set({ error: 'Board failed to confirm save. Check SD card and serial connection.', isLoading: false, saveStatus: 'error' });
        setTimeout(() => set({ saveStatus: 'idle' }), 3000);
      }
    } catch (err: any) {
      console.error('Final Save Error:', err);
      set({ error: err.message, isLoading: false, saveStatus: 'error' });
      setTimeout(() => set({ saveStatus: 'idle' }), 3000);
    }
  },

  updateParam: (sectionIndex, key, value) => {
    set((state) => {
      const newSections = [...state.sections];
      if (newSections[sectionIndex]) {
        newSections[sectionIndex] = {
          ...newSections[sectionIndex],
          params: { ...newSections[sectionIndex].params, [key]: value },
        };
      }
      return { sections: newSections, isDirty: true };
    });
  },

  setActivePresetIndex: (index) => set({ activePresetIndex: index }),

  addPreset: () => {
    set((state) => ({
      sections: [
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
      ],
      isDirty: true,
    }));
  },

  addLog: (msg) => {
    set((state) => ({
      logs: [...state.logs.slice(-49), msg] // Keep last 50 lines
    }));
  },
}));
// @ts-ignore
window.useConfigStore = useConfigStore;
