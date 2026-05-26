export type ConfigBank = 'blade_in' | 'blade_out';
export type UILevel = 'basic' | 'advanced';

export interface BladeStyleConfig {
  style: string;
  params: Record<string, string>;
  styleParams?: Record<string, string>;
}

export interface PresetConfig {
  name: string;
  font: string;
  track: string;
  blades: BladeStyleConfig[];
}

export interface ConfigDocument {
  hardwareProfile: {
    numBlades: number;
    numButtons: number;
    hasBladeDetect: boolean;
  };
  shared: {
    global: Record<string, string>;
    buttonsOn: Record<string, string>;
    buttonsOff: Record<string, string>;
  };
  banks: {
    blade_in: { presets: PresetConfig[] };
    blade_out: { presets: PresetConfig[] };
  };
}
