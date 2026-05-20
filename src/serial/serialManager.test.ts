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
});
