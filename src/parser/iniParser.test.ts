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
    expect(firstPreset?.params.style).toBeUndefined();

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
    expect(firstPreset?.params.style).toBeUndefined();
    expect(firstPreset?.params.accent_style).toBeUndefined();

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
    expect(firstPreset?.params.style).toBeUndefined();

    const regenerated = generateIni(parsed);
    expect(parseIni(regenerated)).toEqual(parsed);
  });
});
