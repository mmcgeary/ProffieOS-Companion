import { generatedStyleSchema } from '../config/generatedStyleSchema';
import type { PresetConfig } from '../config/types';
import {
  getOffModeSelectorValue,
  getOffStateRateMsValue,
  getOffStateValue,
  getStyleTuningValue,
  type StyleTuningKey,
} from './styleTuningConfig';

const COLORS: Record<string, string> = {
  Red: '65535,0,0',
  Green: '0,65535,0',
  Blue: '0,0,65535',
  White: '65535,65535,65535',
  Black: '0,0,0',
  Cyan: '0,65535,65535',
  Magenta: '65535,0,65535',
  Yellow: '65535,65535,0',
  Orange: '65535,42405,0',
  IceBlue: '38550,38550,65535',
  FireOrange: '65535,25700,0',
};

const ARG_INDEX_BY_TUNING_KEY: Partial<Record<StyleTuningKey, number>> = {
  flicker_depth: 17,
  flicker_speed: 18,
  stripe_width: 19,
  stripe_speed: 20,
  motion_gain: 21,
  noise_mix: 22,
  base_contrast: 23,
  drift_rate: 24,
  warm_shift: 25,
  jitter_amount: 26,
  spark_mix: 27,
  heat_rand: 28,
  fire_cooling: 29,
  rainbow_speed: 30,
};

/** Maps schema arg_symbol values to style-string arg positions. */
const ARG_INDEX_BY_SYMBOL: Record<string, number> = {
  BASE_COLOR_ARG: 1,
  ALT_COLOR_ARG: 2,
  STYLE_OPTION_ARG: 3,
  IGNITION_OPTION_ARG: 4,
  BLAST_COLOR_ARG: 5,
  CLASH_COLOR_ARG: 6,
  LOCKUP_COLOR_ARG: 7,
  LOCKUP_POSITION_ARG: 8,
  DRAG_COLOR_ARG: 9,
  DRAG_SIZE_ARG: 10,
  LB_COLOR_ARG: 11,
  STAB_COLOR_ARG: 12,
  MELT_SIZE_ARG: 13,
  SWING_COLOR_ARG: 14,
  SWING_OPTION_ARG: 15,
  EMITTER_COLOR_ARG: 16,
  EMITTER_SIZE_ARG: 17,
  PREON_COLOR_ARG: 18,
  PREON_OPTION_ARG: 19,
  PREON_SIZE_ARG: 20,
  RETRACTION_OPTION_ARG: 21,
  IGNITION_TIME_ARG: 12,
  RETRACTION_TIME_ARG: 13,
  IGNITION_DELAY_ARG: 22,
  IGNITION_COLOR_ARG: 23,
  IGNITION_POWER_UP_ARG: 24,
  RETRACTION_DELAY_ARG: 25,
  RETRACTION_COLOR_ARG: 26,
  RETRACTION_COOL_DOWN_ARG: 27,
  POSTOFF_COLOR_ARG: 28,
  OFF_COLOR_ARG: 14,
  OFF_OPTION_ARG: 15,
  ALT_COLOR2_ARG: 31,
  ALT_COLOR3_ARG: 32,
  STYLE_OPTION2_ARG: 33,
  STYLE_OPTION3_ARG: 34,
  IGNITION_OPTION2_ARG: 35,
  RETRACTION_OPTION2_ARG: 36,
};

/** Builds a key→argIndex lookup from schema for a given style. */
const buildSchemaArgMap = (styleName: string): Map<string, number> => {
  const map = new Map<string, number>();
  const normalized = styleName.trim().toLowerCase();
  const styleDef = generatedStyleSchema.styles.find(
    (s) => s.name.toLowerCase() === normalized,
  );
  if (!styleDef) return map;

  const addParams = (params: ReadonlyArray<{ key: string; arg_symbol: string }>) => {
    for (const param of params) {
      const index = ARG_INDEX_BY_SYMBOL[param.arg_symbol];
      if (index !== undefined && !map.has(param.key)) {
        map.set(param.key, index);
      }
    }
  };

  const coreKey = styleDef.core as keyof typeof generatedStyleSchema.sharedCore;
  const sharedCore = generatedStyleSchema.sharedCore[coreKey];
  if (sharedCore) addParams(sharedCore.params);
  addParams(styleDef.params);
  if ('include_secondary' in styleDef && styleDef.include_secondary) {
    const secondary = generatedStyleSchema.sharedCore.secondary;
    if (secondary) addParams(secondary.params);
  }

  return map;
};

const COLOR_ARG_SYMBOLS = new Set([
  'BASE_COLOR_ARG', 'ALT_COLOR_ARG', 'BLAST_COLOR_ARG', 'CLASH_COLOR_ARG',
  'LOCKUP_COLOR_ARG', 'DRAG_COLOR_ARG', 'LB_COLOR_ARG', 'STAB_COLOR_ARG',
  'SWING_COLOR_ARG', 'EMITTER_COLOR_ARG', 'PREON_COLOR_ARG',
  'IGNITION_COLOR_ARG', 'RETRACTION_COLOR_ARG', 'POSTOFF_COLOR_ARG',
  'OFF_COLOR_ARG', 'ALT_COLOR2_ARG', 'ALT_COLOR3_ARG',
]);

const isColorSymbol = (argSymbol: string): boolean => COLOR_ARG_SYMBOLS.has(argSymbol);

const resolveColor = (value: string): string => COLORS[value] || value;

export const buildStyleString = (blade: PresetConfig['blades'][number]): string => {
  const args = new Array(31).fill('~');
  args[0] = `ini_${blade.style || 'standard'}`;

  // Merge core params with styleParams (styleParams override)
  const mergedParams: Record<string, string> = {
    ...blade.params,
    ...(blade.styleParams ?? {}),
  };

  // Schema-driven placement for params with known arg positions
  const schemaArgMap = buildSchemaArgMap(blade.style || 'standard');
  const normalized = (blade.style || 'standard').trim().toLowerCase();
  const styleDef = generatedStyleSchema.styles.find(
    (s) => s.name.toLowerCase() === normalized,
  );

  // Place schema-driven args
  if (styleDef) {
    const allSchemaParams: Array<{ key: string; arg_symbol: string }> = [];
    const coreKey = styleDef.core as keyof typeof generatedStyleSchema.sharedCore;
    const sharedCore = generatedStyleSchema.sharedCore[coreKey];
    if (sharedCore) allSchemaParams.push(...sharedCore.params);
    allSchemaParams.push(...styleDef.params);
    if ('include_secondary' in styleDef && styleDef.include_secondary) {
      const secondary = generatedStyleSchema.sharedCore.secondary;
      if (secondary) allSchemaParams.push(...secondary.params);
    }

    for (const param of allSchemaParams) {
      const argIndex = ARG_INDEX_BY_SYMBOL[param.arg_symbol];
      if (argIndex === undefined) continue;

      const value = mergedParams[param.key];
      if (value === undefined || value === '') continue;

      // Extend array if needed
      while (args.length <= argIndex) args.push('~');

      if (isColorSymbol(param.arg_symbol)) {
        args[argIndex] = resolveColor(value);
      } else {
        args[argIndex] = value;
      }
    }
  }

  // Core color params at canonical positions (ensures defaults)
  args[1] = resolveColor(mergedParams.base_color || 'Blue');
  args[2] = resolveColor(mergedParams.alt_color || 'Cyan');
  args[5] = resolveColor(mergedParams.blast_color || 'White');
  args[6] = resolveColor(mergedParams.clash_color || 'White');
  args[7] = resolveColor(mergedParams.lockup_color || 'White');

  // Timing and off-state at their canonical positions
  args[12] = getStyleTuningValue(mergedParams, 'ignition_time');
  args[13] = getStyleTuningValue(mergedParams, 'retraction_time');
  args[14] = resolveColor(getOffStateValue(mergedParams, 'off_color'));
  args[15] = getOffModeSelectorValue(getOffStateValue(mergedParams, 'off_mode'));
  args[16] = getOffStateRateMsValue(mergedParams);

  // Tuning keys at their canonical positions
  Object.entries(ARG_INDEX_BY_TUNING_KEY).forEach(([key, index]) => {
    if (index === undefined) return;
    args[index] = getStyleTuningValue(mergedParams, key as StyleTuningKey);
  });

  return args.join(' ');
};
