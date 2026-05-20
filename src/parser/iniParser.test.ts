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
    const data = [
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

[Preset]
Name=Default
Style=Classic
`;
    expect(generateIni(data as any as IniSection[])).toBe(expected);
  });

  it('generates multiple sections with same name', () => {
    const data = [
      { name: 'Preset', params: { Name: 'One' } },
      { name: 'Preset', params: { Name: 'Two' } },
    ];
    const expected = `[Preset]
Name=One

[Preset]
Name=Two
`;
    expect(generateIni(data as any as IniSection[])).toBe(expected);
  });
});
