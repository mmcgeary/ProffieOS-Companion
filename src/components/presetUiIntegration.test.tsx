// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import App from '../App';
import { buildBladeInIni } from '../config/normalizeConfig';
import type { ConfigDocument } from '../config/types';
import { parseIni } from '../parser/iniParser';
import { useConfigStore } from '../state/configStore';
import { PresetEditor } from './PresetEditor';

vi.mock('./BladeCanvas', () => ({
  BladeCanvas: () => <div data-testid="blade-canvas" />,
}));

const makeDoc = (numBlades = 2): ConfigDocument => ({
  hardwareProfile: {
    numBlades,
    numButtons: 2,
    hasBladeDetect: true,
  },
  shared: {
    global: {
      num_buttons: '2',
      volume: '80',
    },
    buttonsOn: {},
    buttonsOff: {},
  },
  banks: {
    blade_in: {
      presets: [
        {
          name: 'Blue',
          font: 'Kestis',
          track: 'tracks/first.wav',
          blades: Array.from({ length: numBlades }, (_, bladeIndex) => ({
            style: bladeIndex % 2 === 0 ? 'standard' : 'pulse',
            params: {
              base_color: bladeIndex % 2 === 0 ? 'Blue' : 'Cyan',
              alt_color: bladeIndex % 2 === 0 ? 'Cyan' : 'White',
              ignition_time: '300',
              retraction_time: '800',
            },
          })),
        },
        {
          name: 'Green',
          font: 'Vader',
          track: 'tracks/second.wav',
          blades: Array.from({ length: numBlades }, (_, bladeIndex) => ({
            style: bladeIndex % 2 === 0 ? 'unstable' : 'standard',
            params: {
              base_color: bladeIndex % 2 === 0 ? 'Green' : 'White',
              alt_color: bladeIndex % 2 === 0 ? 'White' : 'Blue',
              ignition_time: '250',
              retraction_time: '750',
            },
          })),
        },
      ],
    },
    blade_out: {
      presets: [
        {
          name: 'OutPreset',
          font: 'Kestis',
          track: 'tracks/out.wav',
          blades: Array.from({ length: numBlades }, () => ({
            style: 'standard',
            params: { base_color: 'Blue', alt_color: 'Cyan' },
          })),
        },
      ],
    },
  },
});

const seedStore = (numBlades = 2) => {
  const doc = makeDoc(numBlades);
  useConfigStore.setState({
    sections: parseIni(buildBladeInIni(doc)),
    doc,
    activeBank: 'blade_in',
    activePresetIndex: 0,
    activeBladeIndex: 0,
    isConnected: false,
    isDirty: false,
    isLoading: false,
    error: null,
    saveStatus: 'idle',
  });
};

describe('preset UI integration', () => {
  beforeEach(() => {
    seedStore(2);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('does not render Tuning tab', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Tuning' })).toBeNull();
  });

  it('renders drag handles and delete action for presets', () => {
    render(<PresetEditor />);
    expect(screen.getAllByLabelText('Drag preset').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Delete' }).length).toBeGreaterThan(0);
  });

  it('renders Blade 1..N editors from hardware profile', () => {
    render(<PresetEditor />);
    expect(screen.getByRole('tab', { name: 'Blade 1' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Blade 2' })).toBeTruthy();
  });
});
