export interface IniSection {
  name: string;
  params: Record<string, string>;
}

export function parseIni(ini: string): IniSection[] {
  const result: IniSection[] = [];
  let currentSection: IniSection | null = null;

  const lines = ini.split(/\r?\n/);
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) {
      continue;
    }

    if (line.startsWith('[') && line.endsWith(']')) {
      const name = line.substring(1, line.length - 1);
      currentSection = { name, params: {} };
      result.push(currentSection);
      continue;
    }

    const firstEqual = line.indexOf('=');
    if (firstEqual !== -1 && currentSection) {
      const key = line.substring(0, firstEqual).trim();
      const value = line.substring(firstEqual + 1).trim();
      currentSection.params[key] = value;
    }
  }

  return result;
}

export function generateIni(data: IniSection[]): string {
  let result = '';
  let presetCount = 1;
  for (let i = 0; i < data.length; i++) {
    const section = data[i];
    if (section.name.toLowerCase() === 'preset') {
      result += `[preset${presetCount}]\n`;
      presetCount++;
    } else {
      result += `[${section.name}]\n`;
    }
    for (const key in section.params) {
      result += `${key}=${section.params[key]}\n`;
    }
  }
  return result;
}
