import { describe, expect, it } from 'vitest';
import { generatedStyleSchema } from '../config/generatedStyleSchema';
import {
  STYLE_TUNING_ARGS,
  getStyleTuningDefault,
  getStyleTuningValue,
  getVisibleStyleTuningArgs,
  getOffModeSelectorValue,
  getOffStateDefault,
  getOffStateRateMsValue,
  getOffStateValue,
  getSchemaControlsForStyle,
  getBasicSchemaControls,
  getAdvancedSchemaControls,
} from './styleTuningConfig';

const EXPECTED_STYLE_TUNING_METADATA = [
  { key: 'ignition_time', min: 50, max: 2000, defaultValue: 300 },
  { key: 'retraction_time', min: 50, max: 2000, defaultValue: 200 },
  { key: 'flicker_depth', min: 0, max: 32768, defaultValue: 12000 },
  { key: 'flicker_speed', min: 1, max: 20000, defaultValue: 1000 },
  { key: 'stripe_width', min: 1, max: 65535, defaultValue: 5000 },
  { key: 'stripe_speed', min: 0, max: 20000, defaultValue: 900 },
  { key: 'motion_gain', min: 0, max: 32768, defaultValue: 4096 },
  { key: 'noise_mix', min: 0, max: 32768, defaultValue: 8000 },
  { key: 'base_contrast', min: 0, max: 32768, defaultValue: 32768 },
  { key: 'pulse_rate', min: 1, max: 20000, defaultValue: 1200 },
  { key: 'pulse_depth', min: 0, max: 32768, defaultValue: 9000 },
  { key: 'strobe_freq', min: 1, max: 200, defaultValue: 15 },
  { key: 'strobe_ms', min: 1, max: 1000, defaultValue: 1 },
  { key: 'drift_rate', min: 0, max: 32768, defaultValue: 600 },
  { key: 'warm_shift', min: 0, max: 32768, defaultValue: 2000 },
  { key: 'jitter_amount', min: 1, max: 200, defaultValue: 50 },
  { key: 'spark_mix', min: 0, max: 32768, defaultValue: 5000 },
  { key: 'heat_rand', min: 0, max: 32768, defaultValue: 4500 },
  { key: 'fire_cooling', min: 0, max: 255, defaultValue: 55 },
  { key: 'rainbow_speed', min: 1, max: 20000, defaultValue: 800 },
] as const;

describe('styleTuningConfig', () => {
  it('matches firmware tuning metadata coverage, ranges, and defaults', () => {
    expect(
      STYLE_TUNING_ARGS.map(({ key, min, max, defaultValue }) => ({
        key,
        min,
        max,
        defaultValue,
      })),
    ).toEqual(EXPECTED_STYLE_TUNING_METADATA);
  });

  it('returns per-key runtime defaults when a value is missing', () => {
    const params = {};

    for (const arg of STYLE_TUNING_ARGS) {
      const expectedDefault = String(arg.defaultValue);
      expect(getStyleTuningDefault(arg.key)).toBe(expectedDefault);
      expect(getStyleTuningValue(params, arg.key)).toBe(expectedDefault);
    }
  });

  it('uses saved preset values instead of defaults, including zero-like values', () => {
    const params = {
      ignition_time: '900',
      strobe_ms: '42',
      pulse_depth: '0',
    };

    expect(getStyleTuningValue(params, 'ignition_time')).toBe('900');
    expect(getStyleTuningValue(params, 'strobe_ms')).toBe('42');
    expect(getStyleTuningValue(params, 'pulse_depth')).toBe('0');
  });

  it('returns style-scoped tuning args for the selected style', () => {
    const rainbowKeys = getVisibleStyleTuningArgs('rainbow').map((arg) => arg.key);

    expect(rainbowKeys).toContain('ignition_time');
    expect(rainbowKeys).toContain('retraction_time');
    expect(rainbowKeys).toContain('stripe_width');
    expect(rainbowKeys).toContain('stripe_speed');
    expect(rainbowKeys).toContain('rainbow_speed');
    expect(rainbowKeys).not.toContain('strobe_ms');
    expect(rainbowKeys).not.toContain('fire_cooling');
  });

  it('keeps explicitly-set tuning keys visible even when not style-default', () => {
    const visibleKeys = getVisibleStyleTuningArgs('rainbow', { strobe_ms: '12' }).map((arg) => arg.key);
    expect(visibleKeys).toContain('strobe_ms');
  });
});

describe('off-state helpers', () => {
  it('returns off-state defaults when values are missing', () => {
    expect(getOffStateDefault('off_color')).toBe('Black');
    expect(getOffStateDefault('off_mode')).toBe('pulse');
    expect(getOffStateDefault('off_rate_ms')).toBe('1200');
    expect(getOffStateValue({}, 'off_color')).toBe('Black');
  });

  it('maps off_mode to firmware selector values', () => {
    expect(getOffModeSelectorValue('pulse')).toBe('1');
    expect(getOffModeSelectorValue('random')).toBe('2');
    expect(getOffModeSelectorValue('invalid')).toBe('1');
  });

  it('clamps off_rate_ms to firmware bounds', () => {
    expect(getOffStateRateMsValue({ off_rate_ms: '5' })).toBe('10');
    expect(getOffStateRateMsValue({ off_rate_ms: '1200' })).toBe('1200');
    expect(getOffStateRateMsValue({ off_rate_ms: '999999' })).toBe('60000');
  });
});

describe('schema-driven control partitioning', () => {
  it('returns all schema controls for audioflicker style', () => {
    const controls = getSchemaControlsForStyle('audioflicker');
    const keys = controls.map((c) => c.key);
    expect(keys).toContain('base_color');
    expect(keys).toContain('alt_color');
    expect(keys).toContain('lb_color');
    expect(keys).toContain('flicker_mix');
    // Unmapped symbols are intentionally filtered from schema controls.
    expect(keys).not.toContain('alt_color2');
  });

  it('places base_color in basic controls for audioflicker', () => {
    const basic = getBasicSchemaControls('audioflicker');
    const keys = basic.map((c) => c.key);
    expect(keys).toContain('base_color');
    expect(keys).toContain('alt_color');
    expect(keys).toContain('blast_color');
    expect(keys).toContain('clash_color');
    expect(keys).toContain('lockup_color');
  });

  it('places advanced mapped controls in advanced section for audioflicker', () => {
    const advanced = getAdvancedSchemaControls('audioflicker');
    const keys = advanced.map((c) => c.key);
    expect(keys).toContain('lb_color');
    expect(keys).toContain('drag_color');
    expect(keys).toContain('stab_color');
    // Secondary params are currently filtered because their arg symbols
    // are not representable in the current preview arg layout.
    expect(keys).not.toContain('alt_color2');
  });

  it('does not leak basic keys into advanced or vice versa', () => {
    const basic = getBasicSchemaControls('audioflicker').map((c) => c.key);
    const advanced = getAdvancedSchemaControls('audioflicker').map((c) => c.key);
    expect(basic).not.toContain('lb_color');
    expect(advanced).not.toContain('base_color');
  });

  it('handles standard style without secondary params', () => {
    const controls = getSchemaControlsForStyle('standard');
    const keys = controls.map((c) => c.key);
    expect(keys).toContain('base_color');
    expect(keys).not.toContain('alt_color2');
  });

  it('returns empty for unknown style', () => {
    const controls = getSchemaControlsForStyle('nonexistent_style_xyz');
    expect(controls).toEqual([]);
  });

  it('includes style-specific params while deduplicating shared params', () => {
    const schema = generatedStyleSchema as unknown as {
      styles: Array<{
        name: string;
        core: string;
        parser_name: string;
        params?: Array<{ key: string; arg_symbol: string }>;
      }>;
    };
    schema.styles.push({
      name: 'unit_test_style',
      core: 'main',
      parser_name: 'ini2_unit_test_style',
      params: [
          { key: 'style_specific_option', arg_symbol: 'STYLE_OPTION_ARG' },
        { key: 'base_color', arg_symbol: 'BASE_COLOR_ARG' },
      ],
    });

    try {
      const controls = getSchemaControlsForStyle('unit_test_style');
      const keys = controls.map((c) => c.key);

      expect(keys).toContain('style_specific_option');
      expect(keys.filter((k) => k === 'base_color')).toHaveLength(1);
    } finally {
      schema.styles.pop();
    }
  });
});
