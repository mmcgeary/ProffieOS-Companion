import { describe, expect, it } from 'vitest';
import {
  STYLE_TUNING_ARGS,
  getStyleTuningDefault,
  getStyleTuningValue,
  getVisibleStyleTuningArgs,
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
