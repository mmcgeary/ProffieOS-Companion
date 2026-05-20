import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const serialManagerMock = vi.hoisted(() => ({
  connect: vi.fn<() => Promise<void>>(),
  disconnect: vi.fn<() => Promise<void>>(),
  readConfig: vi.fn<() => Promise<string>>(),
  writeConfig: vi.fn<(content: string) => Promise<boolean>>(),
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
    useConfigStore.setState({
      sections: [
        { name: 'global', params: { volume: '80' } },
        { name: 'preset', params: { name: 'Blue' } },
      ],
      isConnected: true,
      isDirty: true,
      isLoading: false,
      error: null,
      saveStatus: 'idle',
      logs: [],
      activePresetIndex: 0,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reconnects and reloads config after successful write before reporting success', async () => {
    const reconnect = deferred<void>();
    serialManagerMock.writeConfig.mockResolvedValue(true);
    serialManagerMock.reconnectAfterReset.mockImplementation(() => reconnect.promise);
    serialManagerMock.readConfig.mockResolvedValue(
      '[global]\nvolume=80\n\n[preset1]\nname=Blue\n'
    );

    const savePromise = useConfigStore.getState().saveToBoard();
    await Promise.resolve();
    await Promise.resolve();

    expect(useConfigStore.getState().saveStatus).toBe('rebooting');

    reconnect.resolve();
    await savePromise;

    expect(serialManagerMock.reconnectAfterReset).toHaveBeenCalledTimes(1);
    expect(serialManagerMock.readConfig).toHaveBeenCalledTimes(1);
    expect(useConfigStore.getState().saveStatus).toBe('success');
    expect(useConfigStore.getState().isDirty).toBe(false);
  });
});
