import { generatedStyleSchema } from '../config/generatedStyleSchema';
import { SUPPORTED_SCHEMA_ARG_SYMBOLS } from '../config/styleArgSymbols';
import type { UILevel } from '../config/types';

export type StyleTuningArg = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  styles: readonly string[];
};

/** Param descriptor derived from the generated schema. */
export interface SchemaControl {
  key: string;
  argSymbol: string;
  label: string;
  uiLevel: UILevel;
}

/** Keys considered "basic" — primary colors and core options. */
const BASIC_PARAM_KEYS = new Set([
  'base_color',
  'alt_color',
  'blast_color',
  'clash_color',
  'lockup_color',
  'style_option',
  'ignition_option',
  'retraction_option',
]);

export const STYLE_TUNING_ARGS = [
  { key: 'ignition_time', label: 'Ignition Time', min: 50, max: 2000, step: 50, defaultValue: 300, styles: ['all'] },
  { key: 'retraction_time', label: 'Retraction Time', min: 50, max: 2000, step: 50, defaultValue: 200, styles: ['all'] },
  {
    key: 'flicker_depth',
    label: 'Flicker Depth',
    min: 0,
    max: 32768,
    step: 100,
    defaultValue: 12000,
    styles: ['standard', 'humpflicker', 'unstable', 'ghostly', 'kylo', 'sequels', 'prequels'],
  },
  {
    key: 'flicker_speed',
    label: 'Flicker Speed',
    min: 1,
    max: 20000,
    step: 10,
    defaultValue: 1000,
    styles: ['standard', 'humpflicker', 'unstable', 'pulse', 'ghostly', 'kylo'],
  },
  {
    key: 'stripe_width',
    label: 'Stripe Width',
    min: 1,
    max: 65535,
    step: 100,
    defaultValue: 5000,
    styles: ['rainbow', 'rotoscope', 'darksaber', 'ancient'],
  },
  {
    key: 'stripe_speed',
    label: 'Stripe Speed',
    min: 0,
    max: 20000,
    step: 100,
    defaultValue: 900,
    styles: ['rainbow', 'rotoscope', 'darksaber', 'ancient'],
  },
  { key: 'motion_gain', label: 'Motion Gain', min: 0, max: 32768, step: 512, defaultValue: 4096, styles: ['all'] },
  {
    key: 'noise_mix',
    label: 'Noise Mix',
    min: 0,
    max: 32768,
    step: 512,
    defaultValue: 8000,
    styles: ['unstable', 'ghostly', 'lightning', 'kylo', 'sequels'],
  },
  {
    key: 'base_contrast',
    label: 'Base Contrast',
    min: 0,
    max: 32768,
    step: 512,
    defaultValue: 32768,
    styles: ['standard', 'humpflicker', 'rotoscope', 'ghostly', 'darksaber', 'prequels', 'ancient'],
  },
  { key: 'pulse_rate', label: 'Pulse Rate', min: 1, max: 20000, step: 10, defaultValue: 1200, styles: ['pulse'] },
  { key: 'pulse_depth', label: 'Pulse Depth', min: 0, max: 32768, step: 100, defaultValue: 9000, styles: ['pulse'] },
  { key: 'strobe_freq', label: 'Strobe Frequency', min: 1, max: 200, step: 1, defaultValue: 15, styles: ['strobe', 'lightning'] },
  { key: 'strobe_ms', label: 'Strobe Duration', min: 1, max: 1000, step: 1, defaultValue: 1, styles: ['strobe'] },
  { key: 'drift_rate', label: 'Drift Rate', min: 0, max: 32768, step: 10, defaultValue: 600, styles: ['ghostly'] },
  { key: 'warm_shift', label: 'Warm Shift', min: 0, max: 32768, step: 512, defaultValue: 2000, styles: ['ancient'] },
  { key: 'jitter_amount', label: 'Jitter Amount', min: 1, max: 200, step: 1, defaultValue: 50, styles: ['unstable', 'lightning'] },
  { key: 'spark_mix', label: 'Spark Mix', min: 0, max: 32768, step: 512, defaultValue: 5000, styles: ['unstable', 'kylo'] },
  { key: 'heat_rand', label: 'Heat Rand', min: 0, max: 32768, step: 512, defaultValue: 4500, styles: ['fire'] },
  { key: 'fire_cooling', label: 'Fire Cooling', min: 0, max: 255, step: 1, defaultValue: 55, styles: ['fire'] },
  { key: 'rainbow_speed', label: 'Rainbow Speed', min: 1, max: 20000, step: 100, defaultValue: 800, styles: ['rainbow'] },
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

const normalizeStyleName = (styleName: string | undefined): string => (styleName ?? '').trim().toLowerCase();

export const getVisibleStyleTuningArgs = (
  styleName: string | undefined,
  params?: Record<string, string>,
): readonly StyleTuningArg[] => {
  const normalizedStyle = normalizeStyleName(styleName);
  return STYLE_TUNING_ARGS.filter((arg) => {
    const styleScopes = arg.styles as readonly string[];
    if (styleScopes.includes('all') || styleScopes.includes(normalizedStyle)) {
      return true;
    }
    const explicitValue = params?.[arg.key];
    return explicitValue !== undefined && explicitValue !== '';
  });
};

const OFF_STATE_BOUNDS = {
  off_rate_ms: { min: 10, max: 60000 },
} as const;

export const OFF_MODE_OPTIONS = [
  { value: 'pulse', label: 'Pulse' },
  { value: 'random', label: 'Random' },
] as const;

export type OffStateKey = 'off_color' | 'off_mode' | 'off_rate_ms';

const OFF_STATE_DEFAULTS: Record<OffStateKey, string> = {
  off_color: 'Black',
  off_mode: 'pulse',
  off_rate_ms: '1200',
};

export const getOffStateDefault = (key: OffStateKey): string => OFF_STATE_DEFAULTS[key];

export const getOffStateValue = (
  params: Record<string, string> | undefined,
  key: OffStateKey,
): string => {
  const value = params?.[key];
  return value !== undefined && value !== '' ? value : getOffStateDefault(key);
};

export const getOffModeSelectorValue = (mode: string | undefined): string =>
  (mode ?? '').trim().toLowerCase() === 'random' ? '2' : '1';

export const getOffStateRateMsValue = (params: Record<string, string> | undefined): string => {
  const raw = getOffStateValue(params, 'off_rate_ms');
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return OFF_STATE_DEFAULTS.off_rate_ms;
  const clamped = Math.min(
    OFF_STATE_BOUNDS.off_rate_ms.max,
    Math.max(OFF_STATE_BOUNDS.off_rate_ms.min, parsed),
  );
  return String(clamped);
};

// --- Schema-driven control helpers ---

const formatLabel = (key: string): string =>
  key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const toSchemaControl = (param: { key: string; arg_symbol: string }): SchemaControl => ({
  key: param.key,
  argSymbol: param.arg_symbol,
  label: formatLabel(param.key),
  uiLevel: BASIC_PARAM_KEYS.has(param.key) ? 'basic' : 'advanced',
});

/**
 * Returns all schema-derived controls for a given style name.
 * Merges shared-core params with style-specific and secondary params
 * (when the style opts in via include_secondary).
 */
export const getSchemaControlsForStyle = (styleName: string): SchemaControl[] => {
  const normalized = styleName.trim().toLowerCase();
  const styleDef = generatedStyleSchema.styles.find(
    (s) => s.name.toLowerCase() === normalized,
  );
  if (!styleDef) return [];

  const seen = new Set<string>();
  const controls: SchemaControl[] = [];

  const addParams = (params: ReadonlyArray<{ key: string; arg_symbol: string }>) => {
    for (const param of params) {
      if (!SUPPORTED_SCHEMA_ARG_SYMBOLS.has(param.arg_symbol)) {
        continue;
      }
      if (!seen.has(param.key)) {
        seen.add(param.key);
        controls.push(toSchemaControl(param));
      }
    }
  };

  // Shared core params for the style's core type
  const coreKey = styleDef.core as keyof typeof generatedStyleSchema.sharedCore;
  const sharedCore = generatedStyleSchema.sharedCore[coreKey];
  if (sharedCore) {
    addParams(sharedCore.params);
  }

  // Style-specific params declared on the style definition.
  addParams(styleDef.params);

  // Secondary shared params when the style opts in
  if ('include_secondary' in styleDef && styleDef.include_secondary) {
    const secondary = generatedStyleSchema.sharedCore.secondary;
    if (secondary) {
      addParams(secondary.params);
    }
  }

  return controls;
};

/** Returns only basic-level controls for a style. */
export const getBasicSchemaControls = (styleName: string): SchemaControl[] =>
  getSchemaControlsForStyle(styleName).filter((c) => c.uiLevel === 'basic');

/** Returns only advanced-level controls for a style. */
export const getAdvancedSchemaControls = (styleName: string): SchemaControl[] =>
  getSchemaControlsForStyle(styleName).filter((c) => c.uiLevel === 'advanced');
