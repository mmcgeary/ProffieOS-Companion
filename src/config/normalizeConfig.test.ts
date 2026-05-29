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

const twoButtonSlotsIni = `[global]
num_buttons=1
volume=100

[buttons_on]
slot_5=blast

[buttons_off]
slot_5=next_preset_or_volume_down

[preset1]
name=Slot Inference
font=Kestis
track=
blade1_style=standard
blade1_base_color=blue
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

    expect(rebuiltBladeInPreset?.params.blade1_style).toBe('audio_flicker');
    expect(rebuiltBladeInPreset?.params.blade3_style).toBe('audio_flicker');
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
    expect(doc.banks.blade_in.presets[0]?.blades[1]?.style).toBe('pulse_accent');
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

  it('promotes shared-core color style params into blade keys and strips param namespace on serialize', () => {
    const iniWithCoreColorStyleParams = `[global]
num_buttons=1

[preset1]
name=ParamColorTest
font=TestFont
track=tracks/test.wav
blade1_style=fire_blade
blade1_base_color=Blue
blade1_alt_color=Cyan
blade1_param.base_color=Red
blade1_param.alt_color=Orange
blade1_param.fire_mix=22000
`;

    const doc = normalizeConfig({
      bladeInIni: iniWithCoreColorStyleParams,
      bladeOutIni: '',
      hwProfile: { numBlades: 1, numButtons: 1, hasBladeDetect: false },
    });

    const blade = doc.banks.blade_in.presets[0].blades[0];
    expect(blade.params.base_color).toBe('Red');
    expect(blade.params.alt_color).toBe('Orange');
    expect(blade.styleParams?.base_color).toBeUndefined();
    expect(blade.styleParams?.alt_color).toBeUndefined();
    expect(blade.styleParams?.fire_mix).toBe('22000');

    const rebuilt = parseIni(buildBladeInIni(doc));
    const preset = rebuilt.find((section) => section.name.toLowerCase() === 'preset1');
    expect(preset?.params.blade1_base_color).toBe('Red');
    expect(preset?.params.blade1_alt_color).toBe('Orange');
    expect(preset?.params['blade1_param.base_color']).toBeUndefined();
    expect(preset?.params['blade1_param.alt_color']).toBeUndefined();
    expect(preset?.params['blade1_param.fire_mix']).toBe('22000');
  });

  it('infers two-button controls from configured AUX slots even when globals under-report', () => {
    const doc = normalizeConfig({
      bladeInIni: twoButtonSlotsIni,
      bladeOutIni: '',
      hwProfile: { numBlades: 1, numButtons: 1, hasBladeDetect: false },
    });

    expect(doc.hardwareProfile.numButtons).toBe(2);
    expect(doc.shared.global.num_buttons).toBe('2');
  });

  it('does not drop blade2 keys when serializing with stale single-blade hardware profile', () => {
    const doc = normalizeConfig({
      bladeInIni: dualBladeCanonicalIni,
      bladeOutIni: dualBladeCanonicalIni,
      hwProfile: { numBlades: 1, numButtons: 1, hasBladeDetect: false },
    });

    expect(doc.hardwareProfile.numBlades).toBe(2);

    doc.hardwareProfile.numBlades = 1;
    const rebuilt = parseIni(buildBladeInIni(doc));
    const preset = rebuilt.find((section) => section.name.toLowerCase() === 'preset1');

    expect(preset?.params.blade2_style).toBe('pulse');
    expect(preset?.params.blade2_base_color).toBe('red');
  });

  it('uses blade lengths from hardware profile when globals do not override them', () => {
    const doc = normalizeConfig({
      bladeInIni: dualBladeCanonicalIni,
      bladeOutIni: dualBladeCanonicalIni,
      hwProfile: { numBlades: 2, numButtons: 2, hasBladeDetect: true, bladeLengths: [144, 130] },
    });

    expect(doc.hardwareProfile.bladeLengths).toEqual([144, 130]);
  });

  it('prefers global bladeN_length values over flashed hardware profile lengths', () => {
    const iniWithGlobalLengths = `[global]
num_buttons=2
blade1_length=180
blade2_length=95

[preset1]
name=Length Override
font=Kestis
track=
blade1_style=standard
blade2_style=standard
`;

    const doc = normalizeConfig({
      bladeInIni: iniWithGlobalLengths,
      bladeOutIni: iniWithGlobalLengths,
      hwProfile: { numBlades: 2, numButtons: 2, hasBladeDetect: true, bladeLengths: [144, 130] },
    });

    expect(doc.hardwareProfile.bladeLengths).toEqual([180, 95]);
  });

  it('serializes accent UI style aliases to parser style names expected by firmware', () => {
    const accentAliasIni = `[global]
num_buttons=2

[preset1]
name=Accent Alias
font=Kestis
track=
blade1_style=audio_flicker
blade2_style=pulse_accent
blade2_base_color=DarkOrange
blade2_alt_color=DarkOrange
blade2_off_color=Orange
`;

    const doc = normalizeConfig({
      bladeInIni: accentAliasIni,
      bladeOutIni: accentAliasIni,
      hwProfile: { numBlades: 2, numButtons: 2, hasBladeDetect: true },
    });

    const rebuilt = parseIni(buildBladeInIni(doc));
    const preset = rebuilt.find((section) => section.name.toLowerCase() === 'preset1');
    expect(preset?.params.blade2_style).toBe('pulse');
  });

  it('normalizes parser style names back to UI accent aliases on load', () => {
    const parserNameIni = `[global]
num_buttons=2

[preset1]
name=Parser Alias
font=Kestis
track=
blade1_style=audio_flicker
blade2_style=pulse
`;

    const doc = normalizeConfig({
      bladeInIni: parserNameIni,
      bladeOutIni: parserNameIni,
      hwProfile: { numBlades: 2, numButtons: 2, hasBladeDetect: true },
    });

    expect(doc.banks.blade_in.presets[0].blades[1].style).toBe('pulse_accent');
  });

  it('serializes film_blade with the firmware parser name film_blade', () => {
    const filmBladeIni = `[global]
num_buttons=2

[preset1]
name=Film Blade
font=Vader
track=
blade1_style=film_blade
blade2_style=audio_flicker
`;

    const doc = normalizeConfig({
      bladeInIni: filmBladeIni,
      bladeOutIni: filmBladeIni,
      hwProfile: { numBlades: 2, numButtons: 2, hasBladeDetect: true },
    });

    const rebuilt = parseIni(buildBladeInIni(doc));
    const preset = rebuilt.find((section) => section.name.toLowerCase() === 'preset1');
    expect(preset?.params.blade1_style).toBe('film_blade');
  });

  it('migrates builtin style tokens to canonical parser names on write', () => {
    const builtinIni = `[global]
num_buttons=2

[preset1]
name=Builtin Migration
font=Kestis
track=
blade1_style=builtin 3 1
blade2_style=builtin 0 2
`;

    const doc = normalizeConfig({
      bladeInIni: builtinIni,
      bladeOutIni: builtinIni,
      hwProfile: { numBlades: 2, numButtons: 2, hasBladeDetect: true },
    });

    const rebuilt = parseIni(buildBladeInIni(doc));
    const preset = rebuilt.find((section) => section.name.toLowerCase() === 'preset1');
    expect(preset?.params.blade1_style).toBe('energy');
    expect(preset?.params.blade2_style).toBe('audio_flicker');
  });

  it('preserves selectable layer keys without any param. prefix in buildBladeInIni', () => {
    const iniWithSelectableKeys = `[global]
num_buttons=1

[preset1]
name=SelectableTest
font=TestFont
track=tracks/test.wav
blade1_style=standard
blade1_clash_mode=simple
blade1_blast_mode=simple
blade1_lockup_mode=simple
blade1_ignition_mode=simple
blade1_retraction_mode=simple
blade1_clash_width=1000
blade1_blast_size=1200
blade1_blast_speed=1400
blade1_spark_color=255,255,0
blade1_spark_size=1500
blade1_drag_size=1600
blade1_melt_size=1700
blade1_stab_size=1800
`;

    const doc = normalizeConfig({
      bladeInIni: iniWithSelectableKeys,
      bladeOutIni: '',
      hwProfile: { numBlades: 1, numButtons: 1, hasBladeDetect: false },
    });

    const rebuilt = parseIni(buildBladeInIni(doc));
    const preset = rebuilt.find((s) => s.name.toLowerCase() === 'preset1');
    expect(preset?.params.blade1_clash_mode).toBe('simple');
    expect(preset?.params.blade1_blast_mode).toBe('simple');
    expect(preset?.params.blade1_lockup_mode).toBe('simple');
    expect(preset?.params.blade1_ignition_mode).toBe('simple');
    expect(preset?.params.blade1_retraction_mode).toBe('simple');
    expect(preset?.params.blade1_clash_width).toBe('1000');
    expect(preset?.params.blade1_blast_size).toBe('1200');
    expect(preset?.params.blade1_blast_speed).toBe('1400');
    expect(preset?.params.blade1_spark_color).toBe('255,255,0');
    expect(preset?.params.blade1_spark_size).toBe('1500');
    expect(preset?.params.blade1_drag_size).toBe('1600');
    expect(preset?.params.blade1_melt_size).toBe('1700');
    expect(preset?.params.blade1_stab_size).toBe('1800');

    // And make sure none of them got parameterized with the "param." prefix
    const keys = Object.keys(preset?.params ?? {});
    keys.forEach((key) => {
      expect(key).not.toContain('param.');
    });
  });
});
