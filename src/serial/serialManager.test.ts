import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SerialManager } from './serialManager';

type SerialManagerInternals = {
  port:
    | {
        readable: { getReader: () => ReadableStreamDefaultReader<Uint8Array> };
        writable: { getWriter: () => WritableStreamDefaultWriter<Uint8Array> };
        open: (options: { baudRate: number }) => Promise<void>;
        close: () => Promise<void>;
      }
    | null;
  reader: ReadableStreamDefaultReader<Uint8Array> | null;
  writer: WritableStreamDefaultWriter<Uint8Array> | null;
  onLineReceived: ((line: string) => void) | null;
  startReading: () => Promise<void> | void;
};

const decoder = new TextDecoder();

const decodedWrites = (writeMock: ReturnType<typeof vi.fn>) => {
  return writeMock.mock.calls.map(([chunk]) => decoder.decode(chunk as Uint8Array));
};

const attachWriter = (manager: SerialManager, writeMock: ReturnType<typeof vi.fn>) => {
  (manager as unknown as SerialManagerInternals).writer = {
    write: writeMock,
  } as unknown as WritableStreamDefaultWriter<Uint8Array>;
};

const emitLine = (manager: SerialManager, line: string) => {
  const listener = (manager as unknown as SerialManagerInternals).onLineReceived;
  if (!listener) {
    throw new Error('Expected serial line listener to be set');
  }
  listener(line);
};

describe('SerialManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('readConfig rejects when no INI response arrives before timeout', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    attachWriter(manager, writeMock);

    const readPromise = manager.readConfig();
    const readExpectation = expect(readPromise).rejects.toThrow('Read timeout');

    expect(decodedWrites(writeMock)).toEqual(['READ_INI\n']);

    await vi.advanceTimersByTimeAsync(10000);
    await readExpectation;
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('writeConfig streams config after READY_FOR_INI and resolves true on SAVE_OK', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    attachWriter(manager, writeMock);

    const writePromise = manager.writeConfig('foo=1\n\n bar=2  ');

    expect(decodedWrites(writeMock)).toEqual(['WRITE_INI\n']);

    emitLine(manager, 'READY_FOR_INI');
    await vi.advanceTimersByTimeAsync(120);

    expect(decodedWrites(writeMock)).toEqual([
      'WRITE_INI\n',
      'foo=1\n',
      'bar=2\n',
      '---END_INI---\n',
    ]);

    emitLine(manager, 'SAVE_OK');
    await expect(writePromise).resolves.toBe(true);
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('writeConfig ignores duplicate READY_FOR_INI lines and streams config once', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    attachWriter(manager, writeMock);

    const writePromise = manager.writeConfig('x=1');

    emitLine(manager, 'READY_FOR_INI');
    emitLine(manager, 'READY_FOR_INI');
    await vi.advanceTimersByTimeAsync(120);

    expect(decodedWrites(writeMock)).toEqual(['WRITE_INI\n', 'x=1\n', '---END_INI---\n']);

    emitLine(manager, 'SAVE_OK');
    await expect(writePromise).resolves.toBe(true);
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('writeConfig resolves false when the board reports SAVE_FAIL', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    attachWriter(manager, writeMock);

    const writePromise = manager.writeConfig('x=1');

    emitLine(manager, 'READY_FOR_INI');
    await vi.advanceTimersByTimeAsync(60);
    emitLine(manager, 'SAVE_FAIL');

    await expect(writePromise).resolves.toBe(false);
    expect(decodedWrites(writeMock)).toEqual(['WRITE_INI\n', 'x=1\n', '---END_INI---\n']);
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('writeConfig rejects when initial command write has a transport failure', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockRejectedValue(new Error('transport write failed'));
    attachWriter(manager, writeMock);

    const writePromise = manager.writeConfig('x=1');

    await expect(writePromise).rejects.toThrow('transport write failed');
    expect(decodedWrites(writeMock)).toEqual(['WRITE_INI\n']);
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('sends READ_INI_BANK blade_out and parses ini payload', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    attachWriter(manager, writeMock);

    const readPromise = manager.readIniBank('blade_out');

    expect(decodedWrites(writeMock)).toEqual(['READ_INI_BANK blade_out\n']);

    emitLine(manager, '---BEGIN_INI---');
    emitLine(manager, 'font=Vader');
    emitLine(manager, 'track=tracks/vader.wav');
    emitLine(manager, '---END_INI---');

    await expect(readPromise).resolves.toBe('font=Vader\ntrack=tracks/vader.wav');
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('returns empty ini content when board reports INI not found for a bank', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    attachWriter(manager, writeMock);

    const readPromise = manager.readIniBank('blade_out');

    expect(decodedWrites(writeMock)).toEqual(['READ_INI_BANK blade_out\n']);

    emitLine(manager, 'ERROR: INI not found');

    await expect(readPromise).resolves.toBe('');
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('sends WRITE_INI_BANK blade_in and streams config after READY_FOR_INI', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    attachWriter(manager, writeMock);

    const writePromise = manager.writeIniBank('blade_in', 'foo=1\n\n bar=2 ');

    expect(decodedWrites(writeMock)).toEqual(['WRITE_INI_BANK blade_in\n']);

    emitLine(manager, 'READY_FOR_INI');
    await vi.advanceTimersByTimeAsync(120);

    expect(decodedWrites(writeMock)).toEqual([
      'WRITE_INI_BANK blade_in\n',
      'foo=1\n',
      'bar=2\n',
      '---END_INI---\n',
    ]);

    emitLine(manager, 'SAVE_OK');
    await expect(writePromise).resolves.toBe(true);
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('reconnectAfterReset continues cleanup when reader cancel rejects', async () => {
    const manager = new SerialManager();
    const startReadingMock = vi.fn();
    (manager as unknown as SerialManagerInternals).startReading = startReadingMock;

    const staleReaderReleaseLock = vi.fn();
    const staleReader = {
      cancel: vi.fn().mockRejectedValue(new Error('reader already closed')),
      releaseLock: staleReaderReleaseLock,
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;
    const staleWriterReleaseLock = vi.fn();
    const staleWriter = {
      releaseLock: staleWriterReleaseLock,
    } as unknown as WritableStreamDefaultWriter<Uint8Array>;
    const freshReader = {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      cancel: vi.fn().mockResolvedValue(undefined),
      releaseLock: vi.fn(),
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;
    const freshWriter = {
      releaseLock: vi.fn(),
    } as unknown as WritableStreamDefaultWriter<Uint8Array>;
    const openMock = vi.fn().mockResolvedValue(undefined);
    const closeMock = vi.fn().mockResolvedValue(undefined);
    const port = {
      open: openMock,
      close: closeMock,
      readable: { getReader: vi.fn().mockReturnValue(freshReader) },
      writable: { getWriter: vi.fn().mockReturnValue(freshWriter) },
    } as SerialManagerInternals['port'];

    const internals = manager as unknown as SerialManagerInternals;
    internals.port = port;
    internals.reader = staleReader;
    internals.writer = staleWriter;

    const reconnectPromise = manager.reconnectAfterReset();
    await vi.advanceTimersByTimeAsync(250);
    await expect(reconnectPromise).resolves.toBeUndefined();

    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(openMock).toHaveBeenCalledWith({ baudRate: 115200 });
    expect(staleReaderReleaseLock).toHaveBeenCalledTimes(1);
    expect(staleWriterReleaseLock).toHaveBeenCalledTimes(1);
  });

  it('disconnect closes port even if reader cancel rejects', async () => {
    const manager = new SerialManager();

    const staleReaderReleaseLock = vi.fn();
    const staleReader = {
      cancel: vi.fn().mockRejectedValue(new Error('reader already closed')),
      releaseLock: staleReaderReleaseLock,
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;
    const staleWriterReleaseLock = vi.fn();
    const staleWriter = {
      releaseLock: staleWriterReleaseLock,
    } as unknown as WritableStreamDefaultWriter<Uint8Array>;
    const closeMock = vi.fn().mockResolvedValue(undefined);
    const port = {
      open: vi.fn(),
      close: closeMock,
      readable: { getReader: vi.fn() },
      writable: { getWriter: vi.fn() },
    } as SerialManagerInternals['port'];

    const internals = manager as unknown as SerialManagerInternals;
    internals.port = port;
    internals.reader = staleReader;
    internals.writer = staleWriter;

    await expect(manager.disconnect()).resolves.toBeUndefined();
    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(staleReaderReleaseLock).toHaveBeenCalledTimes(1);
    expect(staleWriterReleaseLock).toHaveBeenCalledTimes(1);
    expect((manager as unknown as SerialManagerInternals).port).toBeNull();
    expect((manager as unknown as SerialManagerInternals).reader).toBeNull();
    expect((manager as unknown as SerialManagerInternals).writer).toBeNull();
  });

  it('parses hardware profile from key=value response lines', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    attachWriter(manager, writeMock);

    const profilePromise = manager.getHardwareProfile();

    expect(decodedWrites(writeMock)).toEqual(['GET_HW_PROFILE\n']);

    emitLine(manager, 'num_blades=3');
    emitLine(manager, 'num_buttons=2');
    emitLine(manager, 'blade_detect=1');
    await vi.advanceTimersByTimeAsync(250);

    await expect(profilePromise).resolves.toEqual({
      numBlades: 3,
      numButtons: 2,
      hasBladeDetect: true,
    });
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('parses firmware HW_PROFILE contract lines emitted as a single response', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    attachWriter(manager, writeMock);

    const profilePromise = manager.getHardwareProfile();

    emitLine(
      manager,
      'HW_PROFILE num_blades=1 num_buttons=1 has_blade_detect=1 blade_detect=0'
    );
    await vi.advanceTimersByTimeAsync(250);

    await expect(profilePromise).resolves.toEqual({
      numBlades: 1,
      numButtons: 1,
      hasBladeDetect: true,
    });
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('waits for a delayed first command response before collecting profile lines', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    attachWriter(manager, writeMock);

    const profilePromise = manager.getHardwareProfile();
    const settleSpy = vi.fn();
    void profilePromise.then(settleSpy, settleSpy);

    await vi.advanceTimersByTimeAsync(220);
    expect(settleSpy).not.toHaveBeenCalled();

    emitLine(manager, 'num_blades=3');
    emitLine(manager, 'num_buttons=2');
    emitLine(manager, 'blade_detect=1');
    await vi.advanceTimersByTimeAsync(250);

    await expect(profilePromise).resolves.toEqual({
      numBlades: 3,
      numButtons: 2,
      hasBladeDetect: true,
    });
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('rejects getHardwareProfile when command returns no lines before timeout', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    attachWriter(manager, writeMock);

    const profilePromise = manager.getHardwareProfile();
    const profileExpectation = expect(profilePromise).rejects.toThrow('Read timeout');

    expect(decodedWrites(writeMock)).toEqual(['GET_HW_PROFILE\n']);

    await vi.advanceTimersByTimeAsync(6000);

    await profileExpectation;
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('falls back when numeric hardware profile values are not strict integers', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    attachWriter(manager, writeMock);

    const profilePromise = manager.getHardwareProfile();

    emitLine(manager, 'num_blades=3abc');
    emitLine(manager, 'num_buttons=2');
    emitLine(manager, 'blade_detect=true');
    await vi.advanceTimersByTimeAsync(250);

    await expect(profilePromise).resolves.toEqual({
      numBlades: 1,
      numButtons: 2,
      hasBladeDetect: true,
    });
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('rejects getHardwareProfile when no hardware profile keys are returned', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    attachWriter(manager, writeMock);

    const profilePromise = manager.getHardwareProfile();
    const profileExpectation = expect(profilePromise).rejects.toThrow(
      'Incompatible firmware: GET_HW_PROFILE returned no profile keys'
    );

    emitLine(manager, 'SaberIni: Loading...');
    emitLine(manager, 'SaberIni: INI missing');
    await vi.advanceTimersByTimeAsync(250);

    await profileExpectation;
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('treats blade_detect=0 as blade-detect capability present', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    attachWriter(manager, writeMock);

    const profilePromise = manager.getHardwareProfile();

    emitLine(manager, 'num_blades=1');
    emitLine(manager, 'num_buttons=1');
    emitLine(manager, 'blade_detect=0');
    await vi.advanceTimersByTimeAsync(250);

    await expect(profilePromise).resolves.toEqual({
      numBlades: 1,
      numButtons: 1,
      hasBladeDetect: true,
    });
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('treats has_blade_detect=0 as blade-detect capability false', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    attachWriter(manager, writeMock);

    const profilePromise = manager.getHardwareProfile();

    emitLine(manager, 'num_blades=1');
    emitLine(manager, 'num_buttons=1');
    emitLine(manager, 'has_blade_detect=0');
    await vi.advanceTimersByTimeAsync(250);

    await expect(profilePromise).resolves.toEqual({
      numBlades: 1,
      numButtons: 1,
      hasBladeDetect: false,
    });
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('rejects list command when initial write rejects after a delay', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockImplementation(
      () =>
        new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error('write failed')), 300);
        })
    );
    attachWriter(manager, writeMock);

    const fontsPromise = manager.listFonts();
    const fontsExpectation = expect(fontsPromise).rejects.toThrow('write failed');

    await vi.advanceTimersByTimeAsync(350);

    await fontsExpectation;
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('resolves list_fonts with an empty array when command returns no lines', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    attachWriter(manager, writeMock);

    const fontsPromise = manager.listFonts();

    expect(decodedWrites(writeMock)).toEqual(['list_fonts\n']);

    await vi.advanceTimersByTimeAsync(6000);

    await expect(fontsPromise).resolves.toEqual([]);
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('collects list_fonts output into array', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    attachWriter(manager, writeMock);

    const fontsPromise = manager.listFonts();

    expect(decodedWrites(writeMock)).toEqual(['list_fonts\n']);

    emitLine(manager, 'Kestis');
    emitLine(manager, 'Vader');
    await vi.advanceTimersByTimeAsync(250);

    await expect(fontsPromise).resolves.toEqual(['Kestis', 'Vader']);
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('collects list_tracks output into array for the requested font', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    attachWriter(manager, writeMock);

    const tracksPromise = manager.listTracks('Kestis');

    expect(decodedWrites(writeMock)).toEqual(['list_tracks Kestis\n']);

    emitLine(manager, 'tracks/Kestis/theme.wav');
    emitLine(manager, 'tracks/Kestis/duel.wav');
    await vi.advanceTimersByTimeAsync(250);

    await expect(tracksPromise).resolves.toEqual([
      'tracks/Kestis/theme.wav',
      'tracks/Kestis/duel.wav',
    ]);
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });

  it('normalizes trailing slash in listTracks font argument before sending command', async () => {
    const manager = new SerialManager();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    attachWriter(manager, writeMock);

    const tracksPromise = manager.listTracks('Vader/');

    expect(decodedWrites(writeMock)).toEqual(['list_tracks Vader\n']);

    emitLine(manager, 'tracks/vader.wav');
    await vi.advanceTimersByTimeAsync(250);

    await expect(tracksPromise).resolves.toEqual(['tracks/vader.wav']);
    expect((manager as unknown as SerialManagerInternals).onLineReceived).toBeNull();
  });
});
