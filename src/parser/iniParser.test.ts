import { describe, it, expect } from 'vitest';
import { parseIni, generateIni, type IniSection } from './iniParser';

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
