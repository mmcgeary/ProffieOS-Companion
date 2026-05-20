export type StyleTuningArg = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
};

export const STYLE_TUNING_ARGS = [
  { key: 'ignition_time', label: 'Ignition Time', min: 50, max: 2000, step: 50, defaultValue: 300 },
  { key: 'retraction_time', label: 'Retraction Time', min: 50, max: 2000, step: 50, defaultValue: 200 },
  { key: 'flicker_depth', label: 'Flicker Depth', min: 0, max: 32768, step: 100, defaultValue: 12000 },
  { key: 'flicker_speed', label: 'Flicker Speed', min: 1, max: 20000, step: 10, defaultValue: 1000 },
  { key: 'stripe_width', label: 'Stripe Width', min: 1, max: 65535, step: 100, defaultValue: 5000 },
  { key: 'stripe_speed', label: 'Stripe Speed', min: 0, max: 20000, step: 100, defaultValue: 900 },
  { key: 'motion_gain', label: 'Motion Gain', min: 0, max: 32768, step: 512, defaultValue: 4096 },
  { key: 'noise_mix', label: 'Noise Mix', min: 0, max: 32768, step: 512, defaultValue: 8000 },
  { key: 'base_contrast', label: 'Base Contrast', min: 0, max: 32768, step: 512, defaultValue: 32768 },
  { key: 'pulse_rate', label: 'Pulse Rate', min: 1, max: 20000, step: 10, defaultValue: 1200 },
  { key: 'pulse_depth', label: 'Pulse Depth', min: 0, max: 32768, step: 100, defaultValue: 9000 },
  { key: 'strobe_freq', label: 'Strobe Frequency', min: 1, max: 200, step: 1, defaultValue: 15 },
  { key: 'strobe_ms', label: 'Strobe Duration', min: 1, max: 1000, step: 1, defaultValue: 1 },
  { key: 'drift_rate', label: 'Drift Rate', min: 0, max: 32768, step: 10, defaultValue: 600 },
  { key: 'warm_shift', label: 'Warm Shift', min: 0, max: 32768, step: 512, defaultValue: 2000 },
  { key: 'jitter_amount', label: 'Jitter Amount', min: 1, max: 200, step: 1, defaultValue: 50 },
  { key: 'spark_mix', label: 'Spark Mix', min: 0, max: 32768, step: 512, defaultValue: 5000 },
  { key: 'heat_rand', label: 'Heat Rand', min: 0, max: 32768, step: 512, defaultValue: 4500 },
  { key: 'fire_cooling', label: 'Fire Cooling', min: 0, max: 255, step: 1, defaultValue: 55 },
  { key: 'rainbow_speed', label: 'Rainbow Speed', min: 1, max: 20000, step: 100, defaultValue: 800 },
] as const satisfies readonly StyleTuningArg[];

export type StyleTuningKey = (typeof STYLE_TUNING_ARGS)[number]['key'];

const STYLE_TUNING_DEFAULTS = Object.fromEntries(
  STYLE_TUNING_ARGS.map(({ key, defaultValue }) => [key, String(defaultValue)]),
) as Record<StyleTuningKey, string>;

export const getStyleTuningDefault = (key: StyleTuningKey): string => STYLE_TUNING_DEFAULTS[key];

export const getStyleTuningValue = (
  params: Record<string, string> | undefined,
  key: StyleTuningKey,
): string => {
  const value = params?.[key];
  return value !== undefined && value !== '' ? value : getStyleTuningDefault(key);
};
