// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('does not render Tuning tab', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Tuning' })).toBeNull();
  });

  it('shows Config Bank selector when blade-detect is enabled and switches active bank', () => {
    render(<PresetEditor />);

    const selector = screen.getByLabelText('Config Bank') as HTMLSelectElement;
    expect(selector.value).toBe('blade_in');
    expect(screen.getByRole('button', { name: 'Blue' })).toBeTruthy();

    fireEvent.change(selector, { target: { value: 'blade_out' } });

    const state = useConfigStore.getState();
    expect(state.activeBank).toBe('blade_out');
    expect(screen.getByRole('button', { name: 'OutPreset' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Blue' })).toBeNull();
  });

  it('hides Config Bank selector when blade-detect is disabled', () => {
    const doc = makeDoc(2);
    doc.hardwareProfile.hasBladeDetect = false;
    useConfigStore.setState({
      sections: parseIni(buildBladeInIni(doc)),
      doc,
      activeBank: 'blade_in',
      activePresetIndex: 0,
      activeBladeIndex: 0,
    });

    render(<PresetEditor />);

    expect(screen.queryByLabelText('Config Bank')).toBeNull();
  });

  it('edits only the selected bank after switching Config Bank', () => {
    render(<PresetEditor />);

    const selector = screen.getByLabelText('Config Bank');
    fireEvent.change(selector, { target: { value: 'blade_out' } });

    const nameInput = screen.getByDisplayValue('OutPreset') as HTMLInputElement;
    expect(nameInput.value).toBe('OutPreset');
    fireEvent.change(nameInput, { target: { value: 'Out Edited' } });

    fireEvent.change(selector, { target: { value: 'blade_in' } });

    const state = useConfigStore.getState();
    expect(state.doc?.banks.blade_out.presets[0]?.name).toBe('Out Edited');
    expect(state.doc?.banks.blade_in.presets[0]?.name).toBe('Blue');
  });

  it('deletes presets via UI and syncs store doc + sections', () => {
    const setActiveBankSpy = vi.spyOn(useConfigStore.getState(), 'setActiveBank');
    render(<PresetEditor />);
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    expect(deleteButtons.length).toBe(3);

    fireEvent.click(deleteButtons[1]);

    const state = useConfigStore.getState();
    expect(state.doc?.banks.blade_in.presets.map((preset) => preset.name)).toEqual(['Blue', 'Red']);
    expect(getPresetNamesFromSections()).toEqual(['Blue', 'Red']);
    expect(state.activePresetIndex).toBe(0);
    expect(setActiveBankSpy).not.toHaveBeenCalled();
  });

  it('reorders presets via drag/drop and syncs store doc + sections', () => {
    const setActiveBankSpy = vi.spyOn(useConfigStore.getState(), 'setActiveBank');
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
    expect(setActiveBankSpy).not.toHaveBeenCalled();
  });

  it('blocks deleting the last remaining preset via UI', () => {
    const doc = makeDoc(2);
    doc.banks.blade_in.presets = [doc.banks.blade_in.presets[0]];
    useConfigStore.setState({
      sections: parseIni(buildBladeInIni(doc)),
      doc,
      activeBank: 'blade_in',
      activePresetIndex: 0,
      activeBladeIndex: 0,
      isDirty: false,
    });

    render(<PresetEditor />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    const state = useConfigStore.getState();
    expect(state.doc?.banks.blade_in.presets.map((preset) => preset.name)).toEqual(['Blue']);
    expect(getPresetNamesFromSections()).toEqual(['Blue']);
    expect(state.activePresetIndex).toBe(0);
    expect(state.isDirty).toBe(false);
  });

  it('renders Blade 1..N editors from hardware profile', () => {
    render(<PresetEditor />);
    expect(screen.getByRole('tab', { name: 'Blade 1' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Blade 2' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Blade 3' })).toBeTruthy();
  });

  it('shows style-appropriate tuning controls for the selected blade style', () => {
    render(<PresetEditor />);

    expect(screen.queryByText('Rainbow Speed')).toBeNull();
    expect(screen.queryByText('Strobe Duration')).toBeNull();
    expect(screen.getByText('Flicker Speed')).toBeTruthy();
  });

  it('renders off-state controls and updates selected blade off-state params', () => {
    render(<PresetEditor />);

    const blade1Before = {
     ...useConfigStore.getState().doc!.banks.blade_in.presets[0].blades[0].params,
    };

    fireEvent.click(screen.getByRole('tab', { name: 'Blade 2' }));
    const offColorInput = screen.getByLabelText('Off Color');
    const offModeSelect = screen.getByLabelText('Off Mode');
    const offRateInput = screen.getByLabelText('Off Rate (ms)');

    expect(offColorInput).toBeTruthy();
    expect(offModeSelect).toBeTruthy();
    expect(offRateInput).toBeTruthy();

    fireEvent.change(offColorInput, { target: { value: 'Magenta' } });
    fireEvent.change(offModeSelect, { target: { value: 'random' } });
    fireEvent.change(offRateInput, { target: { value: '1800' } });

    const state = useConfigStore.getState().doc?.banks.blade_in.presets[0];
    const blade1 = state?.blades[0];
    const blade2 = state?.blades[1];

    expect(blade1?.params).toEqual(blade1Before);
    expect(blade2?.params.off_color).toBe('Magenta');
    expect(blade2?.params.off_mode).toBe('random');
    expect(blade2?.params.off_rate_ms).toBe('1800');
  });

  it('renders basic and advanced schema-driven control sections', () => {
    render(<PresetEditor />);

    expect(screen.getByText('Basic Style Controls')).toBeTruthy();
    expect(screen.getByText('Advanced Style Controls')).toBeTruthy();
  });

  it('shows base_color in basic controls section for standard style', () => {
    render(<PresetEditor />);

    const basicSection = screen.getByTestId('basic-style-controls');
    expect(basicSection.textContent).toContain('Base Color');
  });

  it('shows advanced params in the advanced controls section', () => {
    render(<PresetEditor />);

    const advancedSection = screen.getByTestId('advanced-style-controls');
    expect(advancedSection.textContent).toContain('Lb Color');
  });

  it('reads schema control values from styleParams and writes edits back via param namespace', () => {
    const doc = makeDoc(2);
    doc.banks.blade_in.presets[0].blades[0].styleParams = { style_option: '2' };
    useConfigStore.setState({
      sections: parseIni(buildBladeInIni(doc)),
      doc,
      activeBank: 'blade_in',
      activePresetIndex: 0,
      activeBladeIndex: 0,
      isDirty: false,
    });

    render(<PresetEditor />);

    const basicSection = screen.getByTestId('basic-style-controls');
    const styleOptionInput = within(basicSection).getByDisplayValue('2') as HTMLInputElement;
    fireEvent.change(styleOptionInput, { target: { value: '7' } });

    const state = useConfigStore.getState();
    const presetSection = state.sections.find((section) => section.name.toLowerCase() === 'preset1');
    expect(state.doc?.banks.blade_in.presets[0].blades[0].styleParams?.style_option).toBe('7');
    expect(presetSection?.params['blade1_param.style_option']).toBe('7');
  });
});
