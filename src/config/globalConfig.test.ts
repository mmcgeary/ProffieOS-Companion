import { describe, expect, it } from 'vitest';
import {
  getGlobalParamValue,
  getGestureEnabled,
  type GlobalGestureKey,
} from './globalConfig';

describe('globalConfig', () => {
  it('reads global values case-insensitively', () => {
    const params = {
      Volume: '70',
      clash_threshold: '9',
    };

    expect(getGlobalParamValue(params, 'volume')).toBe('70');
    expect(getGlobalParamValue(params, 'clash_threshold')).toBe('9');
    expect(getGlobalParamValue(params, 'num_buttons')).toBeUndefined();
  });

  it('prefers explicit per-gesture booleans when present', () => {
    const params = {
      twist_on: 'true',
      GestureFlags: '0',
    };

    expect(getGestureEnabled(params, 'twist_on')).toBe(true);
  });

  it('falls back to legacy GestureFlags bits when explicit values are absent', () => {
    const params = {
      GestureFlags: String(1 | 8 | 32),
    };

    expect(getGestureEnabled(params, 'twist_on')).toBe(true);
    expect(getGestureEnabled(params, 'swing_on')).toBe(true);
    expect(getGestureEnabled(params, 'force_push')).toBe(true);
    expect(getGestureEnabled(params, 'melt')).toBe(false);
  });

  it('returns false for unknown/invalid legacy values', () => {
    const params = {
      GestureFlags: 'nan',
    };

    const keys: GlobalGestureKey[] = [
      'twist_on',
      'twist_off',
      'stab_on',
      'swing_on',
      'thrust_on',
      'force_push',
      'melt',
    ];
    keys.forEach((key) => expect(getGestureEnabled(params, key)).toBe(false));
  });
});
