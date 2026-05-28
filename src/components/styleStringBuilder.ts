import { generatedStyleSchema } from '../config/generatedStyleSchema';
import { ARG_INDEX_BY_SYMBOL } from '../config/styleArgSymbols';
import type { PresetConfig } from '../config/types';
import {
  getOffModeSelectorValue,
  getOffStateRateMsValue,
  getOffStateValue,
  getStyleTuningValue,
  type StyleTuningKey,
} from './styleTuningConfig';

export const NAMED_COLORS: Record<string, string> = {
  AliceBlue: '57311,61423,65535',
  Aqua: '0,65535,65535',
  Aquamarine: '14135,65535,43433',
  Azure: '57311,65535,65535',
  Bisque: '65535,51143,36494',
  Black: '0,0,0',
  BlanchedAlmond: '65535,54741,40349',
  Blue: '0,0,65535',
  Chartreuse: '14135,65535,0',
  Coral: '65535,14135,4883',
  Cornsilk: '65535,61423,47288',
  Cyan: '0,65535,65535',
  DarkOrange: '65535,17476,0',
  DeepPink: '65535,0,19275',
  DeepSkyBlue: '0,34695,65535',
  DodgerBlue: '514,18504,65535',
  FloralWhite: '65535,62708,57311',
  GhostWhite: '61423,61423,65535',
  Green: '0,65535,0',
  GreenYellow: '27756,65535,1542',
  HoneyDew: '57311,65535,57311',
  HotPink: '65535,9252,30326',
  Ivory: '65535,65535,57311',
  LavenderBlush: '65535,57311,59881',
  LemonChiffon: '65535,62708,40349',
  LightCyan: '49087,65535,65535',
  LightPink: '65535,31097,35466',
  LightSalmon: '65535,23387,12850',
  LightYellow: '65535,65535,49087',
  Magenta: '65535,0,65535',
  MintCream: '59881,65535,62708',
  MistyRose: '65535,51143,49601',
  Moccasin: '65535,51143,30583',
  NavajoWhite: '65535,48059,27756',
  Orange: '65535,24929,0',
  OrangeRed: '65535,3598,0',
  PapayaWhip: '65535,56797,43947',
  PeachPuff: '65535,46260,32125',
  Pink: '65535,34952,39578',
  Red: '65535,0,0',
  SeaShell: '65535,59881,56283',
  Snow: '65535,62708,62708',
  SpringGreen: '0,65535,14135',
  SteelBlue: '3598,14649,30326',
  Tomato: '65535,7967,3855',
  White: '65535,65535,65535',
  Yellow: '65535,65535,0',
  ElectricPurple: '32639,0,65535',
  ElectricViolet: '18247,0,65535',
  ElectricLime: '40092,65535,0',
  Amber: '65535,34695,0',
  CyberYellow: '65535,43176,0',
  CanaryYellow: '65535,56797,0',
  PaleGreen: '7196,65535,7196',
  Flamingo: '65535,20560,65278',
  VividViolet: '23130,0,65535',
  PsychedelicPurple: '47802,0,65535',
  HotMagenta: '65535,0,40092',
  BrutalPink: '65535,0,32896',
  NeonRose: '65535,0,14135',
  VividRaspberry: '65535,0,9766',
  HaltRed: '65535,0,4883',
  MoltenCore: '65535,6168,0',
  SafetyOrange: '65535,8481,0',
  OrangeJuice: '65535,14135,0',
  ImperialYellow: '65535,29555,0',
  SchoolBus: '65535,45232,0',
  SuperSaiyan: '65535,47802,0',
  Star: '65535,51657,0',
  Lemon: '65535,60909,0',
  ElectricBanana: '63222,65535,0',
  BusyBee: '59367,65535,0',
  ZeusBolt: '56283,65535,0',
  LimeZest: '47802,65535,0',
  Limoncello: '34695,65535,0',
  CathodeGreen: '0,65535,5654',
  MintyParadise: '0,65535,32896',
  PlungePool: '0,65535,40092',
  VibrantMint: '0,65535,51657',
  MasterSwordBlue: '0,65535,56283',
  BrainFreeze: '0,56283,65535',
  BlueRibbon: '0,8481,65535',
  RareBlue: '0,3341,65535',
  OverdueBlue: '3341,0,65535',
  ViolentViolet: '14135,0,65535',
  IceBlue: '38550,38550,65535',
  FireOrange: '65535,25700,0',
};

const ARG_INDEX_BY_TUNING_KEY: Partial<Record<StyleTuningKey, number>> = {
  flicker_depth: 39,
  flicker_speed: 40,
  stripe_width: 41,
  stripe_speed: 42,
  motion_gain: 43,
  noise_mix: 44,
  base_contrast: 45,
  drift_rate: 46,
  warm_shift: 47,
  jitter_amount: 48,
  spark_mix: 49,
  heat_rand: 50,
  fire_cooling: 51,
  rainbow_speed: 52,
};

const COLOR_ARG_SYMBOLS = new Set([
  'BASE_COLOR_ARG', 'ALT_COLOR_ARG', 'BLAST_COLOR_ARG', 'CLASH_COLOR_ARG',
  'LOCKUP_COLOR_ARG', 'DRAG_COLOR_ARG', 'LB_COLOR_ARG', 'STAB_COLOR_ARG',
  'SWING_COLOR_ARG', 'EMITTER_COLOR_ARG', 'PREON_COLOR_ARG',
  'IGNITION_COLOR_ARG', 'RETRACTION_COLOR_ARG', 'POSTOFF_COLOR_ARG',
  'OFF_COLOR_ARG', 'ALT_COLOR2_ARG', 'ALT_COLOR3_ARG',
]);

const isColorSymbol = (argSymbol: string): boolean => COLOR_ARG_SYMBOLS.has(argSymbol);

const resolveColor = (value: string): string => NAMED_COLORS[value] || value;

export const buildStyleString = (blade: PresetConfig['blades'][number]): string => {
  const maxArgIndex = Math.max(
    ...Object.values(ARG_INDEX_BY_SYMBOL),
    ...Object.values(ARG_INDEX_BY_TUNING_KEY).filter((index): index is number => index !== undefined),
  );
  const args = new Array(maxArgIndex + 1).fill('~');

  // Merge core params with styleParams (styleParams override)
  const mergedParams: Record<string, string> = {
    ...blade.params,
    ...(blade.styleParams ?? {}),
  };

  // Schema-driven placement for params with known arg positions
  const normalized = (blade.style || 'audio_flicker').trim().toLowerCase();
  const styleDef = generatedStyleSchema.styles.find(
    (s) => s.name.toLowerCase() === normalized,
  );
  args[0] = styleDef?.parser_name ?? `ini_${blade.style || 'audio_flicker'}`;

  // Place schema-driven args
  if (styleDef) {
    const allSchemaParams: Array<{ key: string; arg_symbol: string }> = [];
    const coreKey = styleDef.core as keyof typeof generatedStyleSchema.sharedCore;
    const sharedCore = generatedStyleSchema.sharedCore[coreKey];
    if (sharedCore) allSchemaParams.push(...sharedCore.params);
    if ('params' in styleDef) {
      allSchemaParams.push(...styleDef.params);
    }
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

  const setArgIfUnset = (index: number, value: string): void => {
    if (args[index] === '~') {
      args[index] = value;
    }
  };

  // Core color params at canonical positions (ensures defaults)
  setArgIfUnset(ARG_INDEX_BY_SYMBOL.BASE_COLOR_ARG, resolveColor(mergedParams.base_color || 'Blue'));
  setArgIfUnset(ARG_INDEX_BY_SYMBOL.ALT_COLOR_ARG, resolveColor(mergedParams.alt_color || 'Cyan'));
  setArgIfUnset(ARG_INDEX_BY_SYMBOL.BLAST_COLOR_ARG, resolveColor(mergedParams.blast_color || 'White'));
  setArgIfUnset(ARG_INDEX_BY_SYMBOL.CLASH_COLOR_ARG, resolveColor(mergedParams.clash_color || 'White'));
  setArgIfUnset(ARG_INDEX_BY_SYMBOL.LOCKUP_COLOR_ARG, resolveColor(mergedParams.lockup_color || 'White'));

  // Timing and off-state at their canonical positions
  setArgIfUnset(ARG_INDEX_BY_SYMBOL.IGNITION_TIME_ARG, getStyleTuningValue(mergedParams, 'ignition_time'));
  setArgIfUnset(ARG_INDEX_BY_SYMBOL.RETRACTION_TIME_ARG, getStyleTuningValue(mergedParams, 'retraction_time'));
  setArgIfUnset(ARG_INDEX_BY_SYMBOL.OFF_COLOR_ARG, resolveColor(getOffStateValue(mergedParams, 'off_color')));
  setArgIfUnset(ARG_INDEX_BY_SYMBOL.OFF_OPTION_ARG, getOffModeSelectorValue(getOffStateValue(mergedParams, 'off_mode')));
  setArgIfUnset(ARG_INDEX_BY_SYMBOL.RETRACTION_COOL_DOWN_ARG, getOffStateRateMsValue(mergedParams));

  // Tuning keys at their canonical positions
  Object.entries(ARG_INDEX_BY_TUNING_KEY).forEach(([key, index]) => {
    if (index === undefined) return;
    setArgIfUnset(index, getStyleTuningValue(mergedParams, key as StyleTuningKey));
  });

  // WASM Engine Preview HACK: Map new UI arguments to legacy WASM parser expectations
  if (args[0] === 'ini_strobe') {
    // ini_strobe (StrobeX) expects frequency at Arg 3 and duration at Arg 4.
    // UI gives blink_ms at Arg 3 (STYLE_OPTION_ARG) and blink_duty at Arg 4 (IGNITION_OPTION_ARG).
    const blink_ms = parseInt(args[3]) || 1000;
    const blink_duty = parseInt(args[4]) || 500;
    const frequency = Math.max(1, Math.round(1000 / blink_ms));
    const duration = Math.max(1, Math.round((blink_duty / 1000) * blink_ms));
    args[3] = frequency.toString();
    args[4] = duration.toString();
  } else if (args[0] === 'ini_pulse') {
    // ini_pulse (PulsingX) expects pulse_rate at Arg 3.
    // pulsing_stripes gives stripe_width at Arg 3, stripe_speed at Arg 4, pulse_rate at Arg 38.
    if (args[38] && args[38] !== '~') {
      args[3] = args[38];
    }
  }

  return args.join(' ');
};
