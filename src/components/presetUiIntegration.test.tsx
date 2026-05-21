// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
        {
          name: 'Red',
          font: 'Kylo',
          track: 'tracks/third.wav',
          blades: Array.from({ length: numBlades }, (_, bladeIndex) => ({
            style: bladeIndex % 2 === 0 ? 'darksaber' : 'pulse',
            params: {
              base_color: bladeIndex % 2 === 0 ? 'Red' : 'Orange',
              alt_color: bladeIndex % 2 === 0 ? 'White' : 'Yellow',
              ignition_time: '350',
              retraction_time: '700',
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

const getPresetNamesFromSections = (): string[] =>
  useConfigStore
    .getState()
    .sections.filter((section) => section.name.toLowerCase().startsWith('preset'))
    .map((section) => section.params.name);

const createDataTransfer = (): DataTransfer => {
  const data = new Map<string, string>();
  return {
    dropEffect: 'move',
    effectAllowed: 'move',
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [],
    clearData: () => data.clear(),
    getData: (format: string) => data.get(format) ?? '',
    setData: (format: string, value: string) => {
      data.set(format, value);
    },
    setDragImage: () => {},
  } as unknown as DataTransfer;
};

describe('preset UI integration', () => {
  beforeEach(() => {
    seedStore(3);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('does not render Tuning tab', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Tuning' })).toBeNull();
  });

  it('deletes presets via UI and syncs store doc + sections', () => {
    render(<PresetEditor />);
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    expect(deleteButtons.length).toBe(3);

    fireEvent.click(deleteButtons[1]);

    const state = useConfigStore.getState();
    expect(state.doc?.banks.blade_in.presets.map((preset) => preset.name)).toEqual(['Blue', 'Red']);
    expect(getPresetNamesFromSections()).toEqual(['Blue', 'Red']);
    expect(state.activePresetIndex).toBe(0);
  });

  it('reorders presets via drag/drop and syncs store doc + sections', () => {
    render(<PresetEditor />);

    const dragHandles = screen.getAllByLabelText('Drag preset');
    const targetRow = screen.getByRole('button', { name: 'Red' }).parentElement;
    expect(dragHandles.length).toBe(3);
    expect(targetRow).not.toBeNull();

    const dataTransfer = createDataTransfer();
    fireEvent.dragStart(dragHandles[0], { dataTransfer });
    fireEvent.dragOver(targetRow as HTMLElement, { dataTransfer });
    fireEvent.drop(targetRow as HTMLElement, { dataTransfer });

    const state = useConfigStore.getState();
    expect(state.doc?.banks.blade_in.presets.map((preset) => preset.name)).toEqual([
      'Green',
      'Red',
      'Blue',
    ]);
    expect(getPresetNamesFromSections()).toEqual(['Green', 'Red', 'Blue']);
    expect(state.activePresetIndex).toBe(2);
  });

  it('renders Blade 1..N editors from hardware profile', () => {
    render(<PresetEditor />);
    expect(screen.getByRole('tab', { name: 'Blade 1' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Blade 2' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Blade 3' })).toBeTruthy();
  });
});
