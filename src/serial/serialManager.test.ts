import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SerialManager } from './serialManager';

type SerialManagerInternals = {
  writer: WritableStreamDefaultWriter<Uint8Array> | null;
  onLineReceived: ((line: string) => void) | null;
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
