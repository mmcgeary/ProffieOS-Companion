import { describe, expect, it } from 'vitest';
import { parseIni } from '../parser/iniParser';
import { buildBladeInIni, buildBladeOutIni, normalizeConfig } from './normalizeConfig';

const bladeInIni = `[global]
num_buttons=1
volume=100

[buttons_on]
slot_1=blast

[buttons_off]
slot_1=next_preset

[preset1]
name=Blade In Preset
font=Kestis
track=tracks/in.wav
style=standard
base_color=blue
`;

const bladeOutIni = `[global]
num_buttons=1
volume=100

[buttons_on]
slot_1=blast

[buttons_off]
slot_1=next_preset

[preset1]
name=Blade Out Preset
font=Kestis
track=tracks/out.wav
blade1_style=standard
blade2_style=pulse
blade2_base_color=red
`;

const bladeInSharedConflictIni = `[global]
num_buttons=1
volume=100
shared_mode=blade_in
in_only=available

[buttons_on]
slot_1=blast

[buttons_off]
slot_1=next_preset

[preset1]
name=Blade In Preset
font=Kestis
track=tracks/in.wav
style=standard
`;

const bladeOutSharedConflictIni = `[global]
num_buttons=1
volume=80
shared_mode=blade_out
out_only=available

[buttons_on]
slot_1=lockup
slot_2=force

[buttons_off]
slot_1=prev_preset
slot_2=next_preset

[preset1]
name=Blade Out Preset
font=Kestis
track=tracks/out.wav
style=standard
`;

const dualBladeCanonicalIni = `[global]
num_buttons=2
volume=100

[buttons_on]
slot_1=blast

[buttons_off]
slot_1=next_preset

[preset1]
name=Dual Blade Preset
font=Kestis
track=tracks/in.wav
blade1_style=standard
blade1_base_color=blue
blade2_style=pulse
blade2_base_color=red
`;

describe('normalizeConfig', () => {
  it('builds shared + banked model from blade_in and blade_out INI inputs', () => {
    const doc = normalizeConfig({ bladeInIni, bladeOutIni, hwProfile: { numBlades: 3, numButtons: 2 } });

    expect(doc.shared.global.num_buttons).toBe('2');
    expect(doc.banks.blade_in.presets[0].blades).toHaveLength(3);
    expect(doc.banks.blade_out.presets[0].blades).toHaveLength(3);
  });

  it('builds blade_in and blade_out INI from normalized document', () => {
    const doc = normalizeConfig({ bladeInIni, bladeOutIni, hwProfile: { numBlades: 3, numButtons: 2 } });

    const rebuiltBladeIn = parseIni(buildBladeInIni(doc));
    const rebuiltBladeOut = parseIni(buildBladeOutIni(doc));
    const rebuiltBladeInPreset = rebuiltBladeIn.find((section) => section.name.toLowerCase() === 'preset1');
    const rebuiltBladeOutPreset = rebuiltBladeOut.find((section) => section.name.toLowerCase() === 'preset1');

    expect(rebuiltBladeInPreset?.params.blade1_style).toBe('standard');
    expect(rebuiltBladeInPreset?.params.blade3_style).toBe('standard');
    expect(rebuiltBladeOutPreset?.params.blade2_style).toBe('pulse');
    expect(rebuiltBladeOutPreset?.params.blade2_base_color).toBe('red');
  });

  it('merges shared sections from both banks and keeps blade_in values for conflicts', () => {
    const doc = normalizeConfig({
      bladeInIni: bladeInSharedConflictIni,
      bladeOutIni: bladeOutSharedConflictIni,
      hwProfile: { numBlades: 1, numButtons: 1 },
    });

    expect(doc.shared.global.in_only).toBe('available');
    expect(doc.shared.global.out_only).toBe('available');
    expect(doc.shared.global.shared_mode).toBe('blade_in');
    expect(doc.shared.global.volume).toBe('100');

    expect(doc.shared.buttonsOn.slot_1).toBe('blast');
    expect(doc.shared.buttonsOn.slot_2).toBe('force');

    expect(doc.shared.buttonsOff.slot_1).toBe('next_preset');
    expect(doc.shared.buttonsOff.slot_2).toBe('next_preset');
  });

  it('throws when hwProfile.numBlades is not a positive integer', () => {
    expect(() =>
      normalizeConfig({
        bladeInIni,
        bladeOutIni,
        hwProfile: { numBlades: 0, numButtons: 1 },
      })
    ).toThrowError('Invalid hwProfile.numBlades: expected a positive integer');
  });

  it('throws when hwProfile.numButtons is not a positive integer', () => {
    expect(() =>
      normalizeConfig({
        bladeInIni,
        bladeOutIni,
        hwProfile: { numBlades: 1, numButtons: Number.NaN },
      })
    ).toThrowError('Invalid hwProfile.numButtons: expected a positive integer');
  });

  it('preserves multi-blade schema when hwProfile reports fallback single-blade defaults', () => {
    const doc = normalizeConfig({
      bladeInIni: dualBladeCanonicalIni,
      bladeOutIni: dualBladeCanonicalIni,
      hwProfile: { numBlades: 1, numButtons: 1, hasBladeDetect: false },
    });

    expect(doc.hardwareProfile.numBlades).toBe(2);
    expect(doc.hardwareProfile.numButtons).toBe(2);
    expect(doc.banks.blade_in.presets[0]?.blades).toHaveLength(2);
    expect(doc.banks.blade_in.presets[0]?.blades[1]?.style).toBe('pulse');
    expect(doc.banks.blade_in.presets[0]?.blades[1]?.params.base_color).toBe('red');
  });

  it('preserves blade1_param.* keys through parse and serialize round-trip', () => {
    const iniWithStyleParams = `[global]
num_buttons=1

[preset1]
name=ParamTest
font=TestFont
track=tracks/test.wav
blade1_style=standard
blade1_base_color=Blue
blade1_param.flicker_depth=15000
blade1_param.custom_mix=8000
`;

    const doc = normalizeConfig({
      bladeInIni: iniWithStyleParams,
      bladeOutIni: '',
      hwProfile: { numBlades: 1, numButtons: 1, hasBladeDetect: false },
    });

    expect(doc.banks.blade_in.presets[0].blades[0].styleParams).toEqual({
      flicker_depth: '15000',
      custom_mix: '8000',
    });

    // Core params unaffected
    expect(doc.banks.blade_in.presets[0].blades[0].params.base_color).toBe('Blue');
    expect(doc.banks.blade_in.presets[0].blades[0].params).not.toHaveProperty('param.flicker_depth');

    // Round-trip: rebuild INI and verify param.* keys are preserved
    const rebuilt = parseIni(buildBladeInIni(doc));
    const preset = rebuilt.find((s) => s.name.toLowerCase() === 'preset1');
    expect(preset?.params['blade1_param.flicker_depth']).toBe('15000');
    expect(preset?.params['blade1_param.custom_mix']).toBe('8000');
  });
});
