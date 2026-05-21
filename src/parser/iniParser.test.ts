/// <reference types="node" />

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseIni, generateIni, type IniSection } from './iniParser';

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures');

function loadFixture(name: string): string {
  return readFileSync(resolve(fixturesDir, name), 'utf8');
}

const CANONICAL_PRESET_KEYS = ['name', 'font', 'track'] as const;
const CANONICAL_BLADE1_KEYS = [
  'blade1_style',
  'blade1_base_color',
  'blade1_alt_color',
  'blade1_blast_color',
  'blade1_clash_color',
  'blade1_lockup_color',
  'blade1_drag_color',
  'blade1_lb_color',
  'blade1_stab_color',
  'blade1_swing_color',
  'blade1_emitter_color',
  'blade1_preon_color',
  'blade1_off_color',
  'blade1_off_mode',
  'blade1_off_rate_ms',
  'blade1_ignition_time',
  'blade1_retraction_time',
] as const;
const CANONICAL_BLADE2_KEYS = ['blade2_style', 'blade2_base_color', 'blade2_pulse_rate'] as const;
const LEGACY_PRESET_KEYS = [
  'style',
  'base_color',
  'alt_color',
  'blast_color',
  'clash_color',
  'lockup_color',
  'drag_color',
  'lb_color',
  'stab_color',
  'swing_color',
  'emitter_color',
  'preon_color',
  'off_color',
  'off_mode',
  'off_rate_ms',
  'ignition_time',
  'retraction_time',
  'accent_style',
  'accent_base_color',
  'accent_pulse_rate',
] as const;

function expectCanonicalPresetKeyset(params: Record<string, string> | undefined, bladeCount: 1 | 2): void {
  expect(params).toBeDefined();
  const requiredKeys =
    bladeCount === 2
      ? [...CANONICAL_PRESET_KEYS, ...CANONICAL_BLADE1_KEYS, ...CANONICAL_BLADE2_KEYS]
      : [...CANONICAL_PRESET_KEYS, ...CANONICAL_BLADE1_KEYS];
  expect(Object.keys(params ?? {})).toEqual(expect.arrayContaining(requiredKeys));
}

function expectLegacyPresetKeysAbsent(params: Record<string, string> | undefined): void {
  expect(params).toBeDefined();
  for (const key of LEGACY_PRESET_KEYS) {
    expect(params?.[key]).toBeUndefined();
  }
}

describe('parseIni', () => {
  it('parses basic sections and keys', () => {
    const ini = `
[Global]
Version=1.0
Name=ProffieOS

[Preset]
Name=Default
Style=Classic
`;
    const expected = [
      {
        name: 'Global',
        params: {
          Version: '1.0',
          Name: 'ProffieOS',
        },
      },
      {
        name: 'Preset',
        params: {
          Name: 'Default',
          Style: 'Classic',
        },
      },
    ];
    expect(parseIni(ini)).toEqual(expected);
  });

  it('parses multiple sections with same name', () => {
    const ini = `
[Preset]
Name=One
[Preset]
Name=Two
`;
    const expected = [
      {
        name: 'Preset',
        params: { Name: 'One' },
      },
      {
        name: 'Preset',
        params: { Name: 'Two' },
      },
    ];
    expect(parseIni(ini)).toEqual(expected);
  });

  it('ignores comments and empty lines', () => {
    const ini = `
# This is a comment
[Global]
# Another comment
Key=Value

# Empty line above
`;
    const expected = [
      {
        name: 'Global',
        params: {
          Key: 'Value',
        },
      },
    ];
    expect(parseIni(ini)).toEqual(expected);
  });
});

describe('generateIni', () => {
  it('generates basic sections and keys', () => {
    const data: IniSection[] = [
      {
        name: 'Global',
        params: {
          Version: '1.0',
          Name: 'ProffieOS',
        },
      },
      {
        name: 'Preset',
        params: {
          Name: 'Default',
          Style: 'Classic',
        },
      },
    ];
    const expected = `[Global]
Version=1.0
Name=ProffieOS
[preset1]
Name=Default
Style=Classic
`;
    expect(generateIni(data)).toBe(expected);
  });

  it('numbers repeated preset sections for firmware compatibility', () => {
    const data: IniSection[] = [
      { name: 'preset', params: { Name: 'One' } },
      { name: 'preset', params: { Name: 'Two' } },
    ];
    const expected = `[preset1]
Name=One
[preset2]
Name=Two
`;
    expect(generateIni(data)).toBe(expected);
  });

  it('renumbers mixed preset section names without collisions', () => {
    const data: IniSection[] = [
      { name: 'global', params: { volume: '80' } },
      { name: 'preset1', params: { name: 'Kestis' } },
      { name: 'preset2', params: { name: 'Vader' } },
      { name: 'preset', params: { name: 'New Preset' } },
    ];
    const expected = `[global]
volume=80
[preset1]
name=Kestis
[preset2]
name=Vader
[preset3]
name=New Preset
`;
    expect(generateIni(data)).toBe(expected);
  });
});

describe('cross-repo profile fixtures', () => {
  it('roundtrips mhs4 blade_in fixture with canonical single-blade keys', () => {
    const parsed = parseIni(loadFixture('mhs4_ini.ini'));
    const global = parsed.find((section) => section.name.toLowerCase() === 'global');
    const presets = parsed.filter((section) => section.name.toLowerCase().startsWith('preset'));
    const [firstPreset] = presets;

    expect(global?.params.num_buttons).toBe('1');
    expect(presets).toHaveLength(1);
    expect(firstPreset?.params.blade1_style).toBe('standard');
    expect(firstPreset?.params.blade1_base_color).toBe('blue');
    expectCanonicalPresetKeyset(firstPreset?.params, 1);
    expectLegacyPresetKeysAbsent(firstPreset?.params);

    const regenerated = generateIni(parsed);
    expect(parseIni(regenerated)).toEqual(parsed);
  });

  it('roundtrips mining blade_in fixture with canonical two-blade keys', () => {
    const parsed = parseIni(loadFixture('mining.ini'));
    const global = parsed.find((section) => section.name.toLowerCase() === 'global');
    const presets = parsed.filter((section) => section.name.toLowerCase().startsWith('preset'));
    const [firstPreset, secondPreset] = presets;

    expect(global?.params.num_buttons).toBe('2');
    expect(presets).toHaveLength(2);
    expect(firstPreset?.params.blade1_style).toBe('standard');
    expect(firstPreset?.params.blade2_style).toBe('static');
    expect(firstPreset?.params.blade2_pulse_rate).toBe('1000');
    expect(secondPreset?.params.blade1_style).toBe('standard');
    expect(secondPreset?.params.blade2_style).toBe('pulse');
    expect(secondPreset?.params.blade2_pulse_rate).toBe('1200');
    expectCanonicalPresetKeyset(firstPreset?.params, 2);
    expectCanonicalPresetKeyset(secondPreset?.params, 2);
    expectLegacyPresetKeysAbsent(firstPreset?.params);
    expectLegacyPresetKeysAbsent(secondPreset?.params);

    const regenerated = generateIni(parsed);
    expect(parseIni(regenerated)).toEqual(parsed);
  });

  it('roundtrips mhs4 blade_out fixture with canonical single-blade keys', () => {
    const parsed = parseIni(loadFixture('blade_out_mhs4.ini'));
    const global = parsed.find((section) => section.name.toLowerCase() === 'global');
    const presets = parsed.filter((section) => section.name.toLowerCase().startsWith('preset'));
    const [firstPreset] = presets;

    expect(global?.params.num_buttons).toBe('1');
    expect(presets).toHaveLength(1);
    expect(firstPreset?.params.blade1_style).toBe('unstable');
    expect(firstPreset?.params.blade1_base_color).toBe('orange');
    expectCanonicalPresetKeyset(firstPreset?.params, 1);
    expectLegacyPresetKeysAbsent(firstPreset?.params);

    const regenerated = generateIni(parsed);
    expect(parseIni(regenerated)).toEqual(parsed);
  });

  it('roundtrips inline blade_out schema with canonical two-blade keys', () => {
    const ini = `
[global]
num_buttons = 2

[preset1]
name = Chamber Static
font = Kestis
track =
blade1_style = standard
blade1_base_color = dodgerblue
blade1_alt_color = cyan
blade1_blast_color = white
blade1_clash_color = white
blade1_lockup_color = white
blade1_drag_color = orange
blade1_lb_color = cyan
blade1_stab_color = white
blade1_swing_color = black
blade1_emitter_color = dodgerblue
blade1_preon_color = dodgerblue
blade1_off_color = dodgerblue
blade1_off_mode = pulse
blade1_off_rate_ms = 1200
blade1_ignition_time = 300
blade1_retraction_time = 250
blade2_style = static
blade2_base_color = cyan
blade2_pulse_rate = 1000

[preset2]
name = Chamber Pulse
font = Kestis
track =
blade1_style = standard
blade1_base_color = purple
blade1_alt_color = magenta
blade1_blast_color = white
blade1_clash_color = white
blade1_lockup_color = white
blade1_drag_color = orange
blade1_lb_color = cyan
blade1_stab_color = white
blade1_swing_color = black
blade1_emitter_color = purple
blade1_preon_color = purple
blade1_off_color = purple
blade1_off_mode = pulse
blade1_off_rate_ms = 1000
blade1_ignition_time = 300
blade1_retraction_time = 250
blade2_style = pulse
blade2_base_color = magenta
blade2_pulse_rate = 1200
`;
    const parsed = parseIni(ini);
    const global = parsed.find((section) => section.name.toLowerCase() === 'global');
    const presets = parsed.filter((section) => section.name.toLowerCase().startsWith('preset'));
    const [firstPreset, secondPreset] = presets;

    expect(global?.params.num_buttons).toBe('2');
    expect(presets).toHaveLength(2);
    expect(firstPreset?.params.blade2_style).toBe('static');
    expect(firstPreset?.params.blade2_base_color).toBe('cyan');
    expect(firstPreset?.params.blade2_pulse_rate).toBe('1000');
    expect(secondPreset?.params.blade2_style).toBe('pulse');
    expect(secondPreset?.params.blade2_base_color).toBe('magenta');
    expect(secondPreset?.params.blade2_pulse_rate).toBe('1200');
    expectCanonicalPresetKeyset(firstPreset?.params, 2);
    expectCanonicalPresetKeyset(secondPreset?.params, 2);
    expectLegacyPresetKeysAbsent(firstPreset?.params);
    expectLegacyPresetKeysAbsent(secondPreset?.params);

    const regenerated = generateIni(parsed);
    expect(parseIni(regenerated)).toEqual(parsed);
  });
});
