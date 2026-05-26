import {
  filterSectionsByPrefix,
  findSectionByName,
  generateIni,
  parseIni,
  type IniSection,
} from '../parser/iniParser';
import type {
  BladeStyleConfig,
  ConfigBank,
  ConfigDocument,
  PresetConfig,
} from './types';

const CORE_PRESET_KEYS = new Set(['name', 'font', 'track']);
const BLADE_PARAM_KEY = /^blade(\d+)_(.+)$/i;
const STYLE_PARAM_PREFIX = 'param.';
const NUM_BUTTON_KEYS = new Set(['num_buttons', 'numbuttons']);

export interface NormalizeConfigInput {
  bladeInIni: string;
  bladeOutIni: string;
  hwProfile: {
    numBlades: number;
    numButtons: number;
    hasBladeDetect?: boolean;
  };
  preferHardwareBladeCount?: boolean;
}

function getParamValue(params: Record<string, string>, targetKey: string): string | undefined {
  const normalizedTarget = targetKey.toLowerCase();
  const found = Object.entries(params).find(([key]) => key.toLowerCase() === normalizedTarget);
  return found?.[1];
}

function readSharedSection(
  bladeInSections: IniSection[],
  bladeOutSections: IniSection[],
  sectionName: string
): Record<string, string> {
  const bladeInParams = findSectionByName(bladeInSections, sectionName)?.params ?? {};
  const bladeOutParams = findSectionByName(bladeOutSections, sectionName)?.params ?? {};

  // Preserve all shared keys across both banks; blade_in wins when a key conflicts.
  return {
    ...bladeOutParams,
    ...bladeInParams,
  };
}

function assertPositiveInteger(value: number, fieldName: 'numBlades' | 'numButtons'): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid hwProfile.${fieldName}: expected a positive integer`);
  }
}

function parsePositiveIntegerValue(rawValue: string): number | null {
  const trimmed = rawValue.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) {
    return null;
  }
  return Number.parseInt(trimmed, 10);
}

function inferNumBladesFromSections(sections: IniSection[]): number {
  let inferredBladeCount = 1;

  filterSectionsByPrefix(sections, 'preset').forEach((section) => {
    Object.keys(section.params).forEach((rawKey) => {
      const match = rawKey.toLowerCase().match(BLADE_PARAM_KEY);
      if (!match) {
        return;
      }
      const parsedBladeOrdinal = Number.parseInt(match[1], 10);
      if (!Number.isNaN(parsedBladeOrdinal) && parsedBladeOrdinal > inferredBladeCount) {
        inferredBladeCount = parsedBladeOrdinal;
      }
    });
  });

  return inferredBladeCount;
}

function inferNumButtonsFromSections(bladeInSections: IniSection[], bladeOutSections: IniSection[]): number | null {
  let inferredNumButtons: number | null = null;
  const globals = [
    findSectionByName(bladeInSections, 'global'),
    findSectionByName(bladeOutSections, 'global'),
  ];

  globals.forEach((globalSection) => {
    if (!globalSection) {
      return;
    }

    Object.entries(globalSection.params).forEach(([rawKey, rawValue]) => {
      if (!NUM_BUTTON_KEYS.has(rawKey.toLowerCase())) {
        return;
      }
      const parsed = parsePositiveIntegerValue(rawValue);
      if (parsed === null) {
        return;
      }
      inferredNumButtons = inferredNumButtons === null ? parsed : Math.max(inferredNumButtons, parsed);
    });
  });

  return inferredNumButtons;
}

function normalizePreset(section: IniSection, numBlades: number): PresetConfig {
  const legacyBladeParams: Record<string, string> = {};
  const legacyStyleParams: Record<string, string> = {};
  const perBladeParams = new Map<number, Record<string, string>>();
  const perBladeStyleParams = new Map<number, Record<string, string>>();

  Object.entries(section.params).forEach(([rawKey, value]) => {
    const key = rawKey.toLowerCase();
    const match = key.match(BLADE_PARAM_KEY);

    if (match) {
      const bladeIndex = Number.parseInt(match[1], 10) - 1;
      if (bladeIndex >= 0) {
        const fieldName = match[2];
        if (fieldName.startsWith(STYLE_PARAM_PREFIX)) {
          const paramName = fieldName.slice(STYLE_PARAM_PREFIX.length);
          const existing = perBladeStyleParams.get(bladeIndex) ?? {};
          existing[paramName] = value;
          perBladeStyleParams.set(bladeIndex, existing);
        } else {
          const existing = perBladeParams.get(bladeIndex) ?? {};
          existing[fieldName] = value;
          perBladeParams.set(bladeIndex, existing);
        }
      }
      return;
    }

    if (!CORE_PRESET_KEYS.has(key)) {
      if (key.startsWith(STYLE_PARAM_PREFIX)) {
        legacyStyleParams[key.slice(STYLE_PARAM_PREFIX.length)] = value;
      } else {
        legacyBladeParams[key] = value;
      }
    }
  });

  const blades: BladeStyleConfig[] = [];
  const totalBlades = numBlades;
  for (let bladeIndex = 0; bladeIndex < totalBlades; bladeIndex += 1) {
    const mergedParams = {
      ...legacyBladeParams,
      ...(perBladeParams.get(bladeIndex) ?? {}),
    };
    const mergedStyleParams = {
      ...legacyStyleParams,
      ...(perBladeStyleParams.get(bladeIndex) ?? {}),
    };

    const style = mergedParams.style ?? 'standard';
    const bladeParams = { ...mergedParams };
    delete bladeParams.style;

    blades.push({ style, params: bladeParams, styleParams: mergedStyleParams });
  }

  return {
    name: getParamValue(section.params, 'name') ?? '',
    font: getParamValue(section.params, 'font') ?? '',
    track: getParamValue(section.params, 'track') ?? '',
    blades,
  };
}

function normalizeBank(sections: IniSection[], numBlades: number): { presets: PresetConfig[] } {
  const presetSections = filterSectionsByPrefix(sections, 'preset');
  return {
    presets: presetSections.map((section) => normalizePreset(section, numBlades)),
  };
}

function normalizeBladeList(preset: PresetConfig, numBlades: number): BladeStyleConfig[] {
  const normalized: BladeStyleConfig[] = [];
  const totalBlades = numBlades;
  const fallbackBlade = preset.blades[0] ?? { style: 'standard', params: {}, styleParams: {} };

  for (let bladeIndex = 0; bladeIndex < totalBlades; bladeIndex += 1) {
    const sourceBlade = preset.blades[bladeIndex] ?? fallbackBlade;
    normalized.push({
      style: sourceBlade.style,
      params: { ...sourceBlade.params },
      styleParams: { ...sourceBlade.styleParams },
    });
  }

  return normalized;
}

function buildBankIni(doc: ConfigDocument, bank: ConfigBank): string {
  const sections: IniSection[] = [
    {
      name: 'global',
      params: {
        ...doc.shared.global,
        num_buttons: String(doc.hardwareProfile.numButtons),
      },
    },
    {
      name: 'buttons_on',
      params: { ...doc.shared.buttonsOn },
    },
    {
      name: 'buttons_off',
      params: { ...doc.shared.buttonsOff },
    },
  ];

  doc.banks[bank].presets.forEach((preset, presetIndex) => {
    const params: Record<string, string> = {
      name: preset.name,
      font: preset.font,
      track: preset.track,
    };

    const blades = normalizeBladeList(preset, doc.hardwareProfile.numBlades);
    blades.forEach((blade, bladeIndex) => {
      const bladeOrdinal = bladeIndex + 1;
      params[`blade${bladeOrdinal}_style`] = blade.style;
      Object.entries(blade.params).forEach(([key, value]) => {
        params[`blade${bladeOrdinal}_${key}`] = value;
      });
      Object.entries(blade.styleParams).forEach(([key, value]) => {
        params[`blade${bladeOrdinal}_${STYLE_PARAM_PREFIX}${key}`] = value;
      });
    });

    sections.push({
      name: `preset${presetIndex + 1}`,
      params,
    });
  });

  return generateIni(sections);
}

export function normalizeConfig({
  bladeInIni,
  bladeOutIni,
  hwProfile,
  preferHardwareBladeCount = false,
}: NormalizeConfigInput): ConfigDocument {
  assertPositiveInteger(hwProfile.numBlades, 'numBlades');
  assertPositiveInteger(hwProfile.numButtons, 'numButtons');

  const bladeInSections = parseIni(bladeInIni);
  const bladeOutSections = parseIni(bladeOutIni);
  const inferredNumBlades = Math.max(
    inferNumBladesFromSections(bladeInSections),
    inferNumBladesFromSections(bladeOutSections),
  );
  const inferredNumButtons = inferNumButtonsFromSections(bladeInSections, bladeOutSections) ?? 1;
  const effectiveNumBlades = preferHardwareBladeCount
    ? hwProfile.numBlades
    : Math.max(hwProfile.numBlades, inferredNumBlades);
  const effectiveNumButtons = Math.max(hwProfile.numButtons, inferredNumButtons);

  const global = readSharedSection(bladeInSections, bladeOutSections, 'global');
  global.num_buttons = String(effectiveNumButtons);

  return {
    hardwareProfile: {
      numBlades: effectiveNumBlades,
      numButtons: effectiveNumButtons,
      hasBladeDetect: hwProfile.hasBladeDetect ?? bladeOutIni.trim().length > 0,
    },
    shared: {
      global,
      buttonsOn: readSharedSection(bladeInSections, bladeOutSections, 'buttons_on'),
      buttonsOff: readSharedSection(bladeInSections, bladeOutSections, 'buttons_off'),
    },
    banks: {
      blade_in: normalizeBank(bladeInSections, effectiveNumBlades),
      blade_out: normalizeBank(bladeOutSections, effectiveNumBlades),
    },
  };
}

export function buildBladeInIni(doc: ConfigDocument): string {
  return buildBankIni(doc, 'blade_in');
}

export function buildBladeOutIni(doc: ConfigDocument): string {
  return buildBankIni(doc, 'blade_out');
}
