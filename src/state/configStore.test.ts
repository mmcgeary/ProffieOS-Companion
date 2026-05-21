import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildBladeInIni } from '../config/normalizeConfig';
import type { ConfigDocument } from '../config/types';
import { parseIni } from '../parser/iniParser';

const serialManagerMock = vi.hoisted(() => ({
  connect: vi.fn<() => Promise<void>>(),
  disconnect: vi.fn<() => Promise<void>>(),
  readConfig: vi.fn<() => Promise<string>>(),
  writeConfig: vi.fn<(content: string) => Promise<boolean>>(),
  readIniBank: vi.fn<(bank: 'blade_in' | 'blade_out') => Promise<string>>(),
  writeIniBank: vi.fn<(bank: 'blade_in' | 'blade_out', content: string) => Promise<boolean>>(),
  getHardwareProfile: vi.fn<
    () => Promise<{ numBlades: number; numButtons: number; hasBladeDetect: boolean }>
  >(),
  listFonts: vi.fn<() => Promise<string[]>>(),
  listTracks: vi.fn<(font: string) => Promise<string[]>>(),
  reconnectAfterReset: vi.fn<() => Promise<void>>(),
}));

vi.mock('../serial/serialManager', () => ({
  serialManager: serialManagerMock,
}));

function deferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const makeDoc = (): ConfigDocument => ({
  hardwareProfile: {
    numBlades: 2,
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
          name: 'First',
          font: 'Kestis',
          track: 'tracks/first.wav',
          blades: [
            { style: 'standard', params: { base_color: 'Blue' } },
            { style: 'pulse', params: { base_color: 'Cyan' } },
          ],
        },
        {
          name: 'Second',
          font: 'Kestis',
          track: 'tracks/second.wav',
          blades: [
            { style: 'standard', params: { base_color: 'Green' } },
            { style: 'standard', params: { base_color: 'White' } },
          ],
        },
        {
          name: 'Third',
          font: 'Vader',
          track: 'tracks/third.wav',
          blades: [
            { style: 'unstable', params: { base_color: 'Red' } },
            { style: 'standard', params: { base_color: 'White' } },
          ],
        },
      ],
    },
    blade_out: {
      presets: [
        {
          name: 'OutOnly',
          font: 'Vader',
          track: 'tracks/out.wav',
          blades: [
            { style: 'standard', params: { base_color: 'White' } },
            { style: 'pulse', params: { base_color: 'Orange' } },
          ],
        },
      ],
    },
  },
});

describe('configStore', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads safely when window is undefined', async () => {
    vi.resetModules();
    vi.stubGlobal('window', undefined);

    await expect(import('./configStore')).resolves.toHaveProperty('useConfigStore');
  });
});

describe('configStore save lifecycle', () => {
  let useConfigStore: typeof import('./configStore').useConfigStore;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal('window', {} as Window & typeof globalThis);
    ({ useConfigStore } = await import('./configStore'));
    const doc = makeDoc();
    useConfigStore.setState({
      sections: [
        { name: 'global', params: { volume: '80' } },
        { name: 'preset', params: { name: 'Blue' } },
      ],
      doc,
      isConnected: true,
      isDirty: true,
      isLoading: false,
      error: null,
      saveStatus: 'idle',
      logs: [],
      activeBank: 'blade_in',
      activePresetIndex: 0,
      activeBladeIndex: 0,
    });
    serialManagerMock.writeConfig.mockResolvedValue(true);
    serialManagerMock.writeIniBank.mockResolvedValue(true);
    serialManagerMock.readConfig.mockResolvedValue('[global]\nvolume=80');
    serialManagerMock.readIniBank.mockImplementation(async (bank) =>
      bank === 'blade_in'
        ? '[global]\nnum_buttons=2\n\n[preset1]\nname=Blue\nfont=Kestis\ntrack=tracks/first.wav'
        : '[global]\nnum_buttons=2\n\n[preset1]\nname=OutOnly\nfont=Vader\ntrack=tracks/out.wav'
    );
    serialManagerMock.getHardwareProfile.mockResolvedValue({
      numBlades: 2,
      numButtons: 2,
      hasBladeDetect: true,
    });
    serialManagerMock.listFonts.mockResolvedValue(['Kestis', 'Vader']);
    serialManagerMock.listTracks.mockImplementation(async (font) => {
      if (font.toLowerCase() === 'kestis') {
        return ['tracks/first.wav', 'tracks/second.wav'];
      }
      return ['tracks/third.wav', 'tracks/out.wav'];
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reorders presets in active bank and syncs preset sections', () => {
    const doc = makeDoc();
    useConfigStore.setState({
      doc,
      sections: parseIni(buildBladeInIni(doc)),
      activeBank: 'blade_in',
      activePresetIndex: 0,
    });

    useConfigStore.getState().reorderPreset(0, 2);

    const state = useConfigStore.getState() as ReturnType<typeof useConfigStore.getState> & {
      doc: ConfigDocument;
    };
    const sectionPresetNames = state.sections
      .filter((section) => section.name.toLowerCase().startsWith('preset'))
      .map((section) => section.params.name);

    expect(state.doc.banks.blade_in.presets.map((preset) => preset.name)).toEqual([
      'Second',
      'Third',
      'First',
    ]);
    expect(sectionPresetNames).toEqual(['Second', 'Third', 'First']);
    expect(state.doc.banks.blade_out.presets.map((preset) => preset.name)).toEqual(['OutOnly']);
    expect(state.activePresetIndex).toBe(2);
  });

  it('deletes active preset, updates active index safely, and syncs sections', () => {
    const doc = makeDoc();
    useConfigStore.setState({
      doc,
      sections: parseIni(buildBladeInIni(doc)),
      activeBank: 'blade_in',
      activePresetIndex: 1,
    });

    useConfigStore.getState().deletePreset(1);

    const state = useConfigStore.getState() as ReturnType<typeof useConfigStore.getState> & {
      doc: ConfigDocument;
    };
    const sectionPresetNames = state.sections
      .filter((section) => section.name.toLowerCase().startsWith('preset'))
      .map((section) => section.params.name);

    expect(state.doc.banks.blade_in.presets.map((preset) => preset.name)).toEqual(['First', 'Third']);
    expect(sectionPresetNames).toEqual(['First', 'Third']);
    expect(state.activePresetIndex).toBe(0);
  });

  it('blocks deleting the last remaining preset in active bank', () => {
    const doc = makeDoc();
    doc.banks.blade_in.presets = [doc.banks.blade_in.presets[0]];
    useConfigStore.setState({
      doc,
      sections: parseIni(buildBladeInIni(doc)),
      activeBank: 'blade_in',
      activePresetIndex: 0,
      isDirty: false,
    });

    useConfigStore.getState().deletePreset(0);

    const state = useConfigStore.getState() as ReturnType<typeof useConfigStore.getState> & {
      doc: ConfigDocument;
    };
    const sectionPresetNames = state.sections
      .filter((section) => section.name.toLowerCase().startsWith('preset'))
      .map((section) => section.params.name);

    expect(state.doc.banks.blade_in.presets.map((preset) => preset.name)).toEqual(['First']);
    expect(sectionPresetNames).toEqual(['First']);
    expect(state.activePresetIndex).toBe(0);
    expect(state.isDirty).toBe(false);
  });

  it('syncs global/buttons updateParam edits into doc and bank serialization', async () => {
    useConfigStore.setState({
      sections: [
        { name: 'global', params: { volume: '80', num_buttons: '2' } },
        { name: 'buttons_on', params: { slot_5: 'blast' } },
        { name: 'buttons_off', params: { slot_0: 'on_or_volume_up' } },
        {
          name: 'preset1',
          params: {
            name: 'First',
            font: 'Kestis',
            track: 'tracks/first.wav',
            blade1_style: 'standard',
            blade2_style: 'pulse',
            blade1_base_color: 'Blue',
            blade2_base_color: 'Cyan',
          },
        },
      ],
      doc: makeDoc(),
    });

    const { updateParam, saveToBoard } = useConfigStore.getState();
    updateParam(0, 'volume', '95');
    updateParam(1, 'slot_5', 'toggle_multi_blast');
    updateParam(2, 'slot_0', 'prev_preset_if_not_volume_menu');

    const state = useConfigStore.getState() as ReturnType<typeof useConfigStore.getState> & {
      doc: ConfigDocument;
    };

    expect(state.doc.shared.global.volume).toBe('95');
    expect(state.doc.shared.buttonsOn.slot_5).toBe('toggle_multi_blast');
    expect(state.doc.shared.buttonsOff.slot_0).toBe('prev_preset_if_not_volume_menu');

    await saveToBoard();

    const writtenBanks = serialManagerMock.writeIniBank.mock.calls.map(([bank, content]) => ({
      bank,
      content,
    }));
    expect(writtenBanks).toHaveLength(2);
    for (const { content } of writtenBanks) {
      expect(content).toContain('volume=95');
      expect(content).toContain('slot_5=toggle_multi_blast');
      expect(content).toContain('slot_0=prev_preset_if_not_volume_menu');
    }
  });

  it('updateBladeParam updates active-bank blade and keeps preset section synced', () => {
    useConfigStore.setState({
      sections: [
        { name: 'global', params: { volume: '80' } },
        {
          name: 'preset1',
          params: {
            name: 'First',
            font: 'Kestis',
            track: 'tracks/first.wav',
            blade1_style: 'standard',
            blade2_style: 'pulse',
            blade1_base_color: 'Blue',
            blade2_base_color: 'Cyan',
          },
        },
      ],
      doc: makeDoc(),
      activeBank: 'blade_in',
    });

    useConfigStore.getState().updateBladeParam(0, 1, 'base_color', 'Purple');

    const state = useConfigStore.getState() as ReturnType<typeof useConfigStore.getState> & {
      doc: ConfigDocument;
    };
    expect(state.doc.banks.blade_in.presets[0].blades[1].params.base_color).toBe('Purple');
    expect(state.doc.banks.blade_out.presets[0].blades[1].params.base_color).toBe('Orange');
    expect(state.sections[1]?.params.blade2_base_color).toBe('Purple');
  });

  it("setActiveBank('blade_out') refreshes sections from blade_out content", () => {
    const doc = makeDoc();
    useConfigStore.setState({
      sections: parseIni(buildBladeInIni(doc)),
      doc,
      activeBank: 'blade_in',
      activePresetIndex: 0,
    });

    useConfigStore.getState().setActiveBank('blade_out');

    const state = useConfigStore.getState() as ReturnType<typeof useConfigStore.getState> & {
      doc: ConfigDocument;
    };
    const presetSections = state.sections.filter((section) =>
      section.name.toLowerCase().startsWith('preset')
    );

    expect(state.activeBank).toBe('blade_out');
    expect(presetSections).toHaveLength(1);
    expect(presetSections[0]?.params.name).toBe('OutOnly');
    expect(presetSections[0]?.params.blade1_style).toBe('standard');
  });

  it('updateBladeParam style in blade_out updates doc and bladeN_style section key', () => {
    const doc = makeDoc();
    useConfigStore.setState({
      sections: parseIni(buildBladeInIni(doc)),
      doc,
      activeBank: 'blade_in',
      activePresetIndex: 0,
    });

    const store = useConfigStore.getState();
    store.setActiveBank('blade_out');
    store.updateBladeParam(0, 0, 'style', 'unstable');

    const state = useConfigStore.getState() as ReturnType<typeof useConfigStore.getState> & {
      doc: ConfigDocument;
    };
    const presetSections = state.sections.filter((section) =>
      section.name.toLowerCase().startsWith('preset')
    );

    expect(state.doc.banks.blade_out.presets[0].blades[0].style).toBe('unstable');
    expect(state.doc.banks.blade_in.presets[0].blades[0].style).toBe('standard');
    expect(presetSections[0]?.params.name).toBe('OutOnly');
    expect(presetSections[0]?.params.blade1_style).toBe('unstable');
  });

  it('preserves dual-blade presets when hardware profile command falls back to single-blade defaults', async () => {
    serialManagerMock.getHardwareProfile.mockResolvedValue({
      numBlades: 1,
      numButtons: 1,
      hasBladeDetect: false,
    });
    serialManagerMock.readIniBank.mockImplementation(async (bank) =>
      bank === 'blade_in'
        ? [
            '[global]',
            'num_buttons=2',
            '',
            '[preset1]',
            'name=Dual In',
            'font=Kestis',
            'track=tracks/in.wav',
            'blade1_style=standard',
            'blade1_base_color=Blue',
            'blade2_style=pulse',
            'blade2_base_color=Cyan',
          ].join('\n')
        : [
            '[global]',
            'num_buttons=2',
            '',
            '[preset1]',
            'name=Dual Out',
            'font=Kestis',
            'track=tracks/out.wav',
            'blade1_style=standard',
            'blade1_base_color=Blue',
            'blade2_style=static',
            'blade2_base_color=White',
          ].join('\n')
    );

    await useConfigStore.getState().loadFromBoard();

    const state = useConfigStore.getState() as ReturnType<typeof useConfigStore.getState> & {
      doc: ConfigDocument;
    };
    const presetSection = state.sections.find((section) => section.name.toLowerCase() === 'preset1');

    expect(state.doc.hardwareProfile.numBlades).toBe(2);
    expect(state.doc.hardwareProfile.numButtons).toBe(2);
    expect(state.doc.banks.blade_in.presets[0]?.blades).toHaveLength(2);
    expect(state.doc.banks.blade_in.presets[0]?.blades[1]?.style).toBe('pulse');
    expect(presetSection?.params.blade2_style).toBe('pulse');
  });

  it('blocks save when media is missing', async () => {
    const doc = makeDoc();
    doc.banks.blade_in.presets[0].font = 'MissingFont';
    doc.banks.blade_in.presets[0].track = 'tracks/missing.wav';
    useConfigStore.setState({ doc, activeBank: 'blade_in', activePresetIndex: 0 });

    await useConfigStore.getState().saveToBoard();

    expect(useConfigStore.getState().error?.toLowerCase()).toContain('missing');
    expect(serialManagerMock.writeIniBank).not.toHaveBeenCalled();
  });

  it('writes both banks and reloads before reporting success', async () => {
    const reconnect = deferred<void>();
    serialManagerMock.reconnectAfterReset.mockImplementation(() => reconnect.promise);

    const savePromise = useConfigStore.getState().saveToBoard();
    await vi.waitFor(() => {
      expect(useConfigStore.getState().saveStatus).toBe('rebooting');
    });

    reconnect.resolve();
    await savePromise;

    expect(serialManagerMock.writeIniBank).toHaveBeenNthCalledWith(
      1,
      'blade_in',
      expect.stringContaining('[preset1]')
    );
    expect(serialManagerMock.writeIniBank).toHaveBeenNthCalledWith(
      2,
      'blade_out',
      expect.stringContaining('[preset1]')
    );
    expect(serialManagerMock.readIniBank).toHaveBeenCalledWith('blade_in');
    expect(serialManagerMock.readIniBank).toHaveBeenCalledWith('blade_out');
    expect(serialManagerMock.reconnectAfterReset).toHaveBeenCalledTimes(1);
    expect(useConfigStore.getState().saveStatus).toBe('success');
    expect(useConfigStore.getState().isDirty).toBe(false);
  });
});
