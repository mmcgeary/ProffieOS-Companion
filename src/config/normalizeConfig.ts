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

export interface NormalizeConfigInput {
  bladeInIni: string;
  bladeOutIni: string;
  hwProfile: {
    numBlades: number;
    numButtons: number;
    hasBladeDetect?: boolean;
  };
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

function normalizePreset(section: IniSection, numBlades: number): PresetConfig {
  const legacyBladeParams: Record<string, string> = {};
  const perBladeParams = new Map<number, Record<string, string>>();

  Object.entries(section.params).forEach(([rawKey, value]) => {
    const key = rawKey.toLowerCase();
    const match = key.match(BLADE_PARAM_KEY);

    if (match) {
      const bladeIndex = Number.parseInt(match[1], 10) - 1;
      if (bladeIndex >= 0) {
        const fieldName = match[2];
        const existing = perBladeParams.get(bladeIndex) ?? {};
        existing[fieldName] = value;
        perBladeParams.set(bladeIndex, existing);
      }
      return;
    }

    if (!CORE_PRESET_KEYS.has(key)) {
      legacyBladeParams[key] = value;
    }
  });

  const blades: BladeStyleConfig[] = [];
  const totalBlades = numBlades;
  for (let bladeIndex = 0; bladeIndex < totalBlades; bladeIndex += 1) {
    const mergedParams = {
      ...legacyBladeParams,
      ...(perBladeParams.get(bladeIndex) ?? {}),
    };

    const style = mergedParams.style ?? 'standard';
    const bladeParams = { ...mergedParams };
    delete bladeParams.style;

    blades.push({ style, params: bladeParams });
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
  const fallbackBlade = preset.blades[0] ?? { style: 'standard', params: {} };

  for (let bladeIndex = 0; bladeIndex < totalBlades; bladeIndex += 1) {
    const sourceBlade = preset.blades[bladeIndex] ?? fallbackBlade;
    normalized.push({
      style: sourceBlade.style,
      params: { ...sourceBlade.params },
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
    });

    sections.push({
      name: `preset${presetIndex + 1}`,
      params,
    });
  });

  return generateIni(sections);
}

export function normalizeConfig({ bladeInIni, bladeOutIni, hwProfile }: NormalizeConfigInput): ConfigDocument {
  assertPositiveInteger(hwProfile.numBlades, 'numBlades');
  assertPositiveInteger(hwProfile.numButtons, 'numButtons');

  const bladeInSections = parseIni(bladeInIni);
  const bladeOutSections = parseIni(bladeOutIni);

  const global = readSharedSection(bladeInSections, bladeOutSections, 'global');
  global.num_buttons = String(hwProfile.numButtons);

  return {
    hardwareProfile: {
      numBlades: hwProfile.numBlades,
      numButtons: hwProfile.numButtons,
      hasBladeDetect: hwProfile.hasBladeDetect ?? bladeOutIni.trim().length > 0,
    },
    shared: {
      global,
      buttonsOn: readSharedSection(bladeInSections, bladeOutSections, 'buttons_on'),
      buttonsOff: readSharedSection(bladeInSections, bladeOutSections, 'buttons_off'),
    },
    banks: {
      blade_in: normalizeBank(bladeInSections, hwProfile.numBlades),
      blade_out: normalizeBank(bladeOutSections, hwProfile.numBlades),
    },
  };
}

export function buildBladeInIni(doc: ConfigDocument): string {
  return buildBankIni(doc, 'blade_in');
}

export function buildBladeOutIni(doc: ConfigDocument): string {
  return buildBankIni(doc, 'blade_out');
}
