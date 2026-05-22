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

const resolveColor = (value: string): string => COLORS[value] || value;

export const buildStyleString = (blade: PresetConfig['blades'][number]): string => {
  const args = new Array(31).fill('~');
  args[0] = `ini_${blade.style || 'standard'}`;
  args[1] = resolveColor(blade.params.base_color || 'Blue');
  args[2] = resolveColor(blade.params.alt_color || 'Cyan');
  args[5] = resolveColor(blade.params.blast_color || 'White');
  args[6] = resolveColor(blade.params.clash_color || 'White');
  args[7] = resolveColor(blade.params.lockup_color || 'White');
  args[12] = getStyleTuningValue(blade.params, 'ignition_time');
  args[13] = getStyleTuningValue(blade.params, 'retraction_time');
  args[14] = resolveColor(getOffStateValue(blade.params, 'off_color'));
  args[15] = getOffModeSelectorValue(getOffStateValue(blade.params, 'off_mode'));
  args[16] = getOffStateRateMsValue(blade.params);

  Object.entries(ARG_INDEX_BY_TUNING_KEY).forEach(([key, index]) => {
    if (index === undefined) return;
    args[index] = getStyleTuningValue(blade.params, key as StyleTuningKey);
  });

  return args.join(' ');
};
