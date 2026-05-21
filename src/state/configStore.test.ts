import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigDocument } from '../config/types';

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

  it('reorders presets in active bank', () => {
    useConfigStore.getState().reorderPreset(0, 2);

    const state = useConfigStore.getState() as ReturnType<typeof useConfigStore.getState> & {
      doc: ConfigDocument;
    };
    expect(state.doc.banks.blade_in.presets.map((preset) => preset.name)).toEqual([
      'Second',
      'Third',
      'First',
    ]);
    expect(state.doc.banks.blade_out.presets.map((preset) => preset.name)).toEqual(['OutOnly']);
  });

  it('deletes active preset and updates active index safely', () => {
    const doc = makeDoc();
    doc.banks.blade_in.presets = [doc.banks.blade_in.presets[0], doc.banks.blade_in.presets[1]];
    useConfigStore.setState({
      doc,
      activeBank: 'blade_in',
      activePresetIndex: 1,
    });

    useConfigStore.getState().deletePreset(1);

    const state = useConfigStore.getState() as ReturnType<typeof useConfigStore.getState> & {
      doc: ConfigDocument;
    };
    expect(state.doc.banks.blade_in.presets.map((preset) => preset.name)).toEqual(['First']);
    expect(state.activePresetIndex).toBe(0);
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
