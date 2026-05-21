// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { buildBladeInIni } from '../config/normalizeConfig';
import type { ConfigDocument } from '../config/types';
import { parseIni } from '../parser/iniParser';
import { useConfigStore } from '../state/configStore';
import { PresetEditor } from './PresetEditor';

const serialManagerMock = vi.hoisted(() => ({
  listFonts: vi.fn<() => Promise<string[]>>(),
  listTracks: vi.fn<(font: string) => Promise<string[]>>(),
}));

vi.mock('../serial/serialManager', () => ({
  serialManager: serialManagerMock,
}));

vi.mock('./BladeCanvas', () => ({
  BladeCanvas: () => <div data-testid="blade-canvas" />,
}));

const makeDoc = (): ConfigDocument => ({
  hardwareProfile: {
    numBlades: 1,
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
          font: 'PresetFont',
          track: 'tracks/preset.wav',
          blades: [{ style: 'standard', params: { base_color: 'Blue' } }],
        },
      ],
    },
    blade_out: {
      presets: [
        {
          name: 'Out',
          font: 'PresetFont',
          track: 'tracks/out.wav',
          blades: [{ style: 'standard', params: { base_color: 'Blue' } }],
        },
      ],
    },
  },
});

describe('PresetEditor SD font loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const doc = makeDoc();
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
      logs: [],
    });
    serialManagerMock.listFonts.mockResolvedValue(['SDOnlyFont']);
    serialManagerMock.listTracks.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it('loads SD font options when connection transitions to connected', async () => {
    render(<PresetEditor />);

    expect(serialManagerMock.listFonts).not.toHaveBeenCalled();

    useConfigStore.setState({ isConnected: true });

    await waitFor(() => {
      expect(serialManagerMock.listFonts).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('option', { name: 'SDOnlyFont' })).toBeTruthy();
  });
});
