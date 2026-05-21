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
});
