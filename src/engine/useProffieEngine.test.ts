import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hookState = vi.hoisted(() => ({
  setters: [] as Array<ReturnType<typeof vi.fn>>,
}));

vi.mock('react', () => ({
  useState: (initial: unknown | (() => unknown)) => {
    const value = typeof initial === 'function' ? (initial as () => unknown)() : initial;
    const setter = vi.fn();
    hookState.setters.push(setter);
    return [value, setter] as const;
  },
  useEffect: (effect: () => void | (() => void)) => {
    effect();
  },
  useRef: <T>(initial: T) => ({ current: initial }),
  useCallback: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));

import { useProffieEngine } from './useProffieEngine';

const flushPromises = async (cycles = 5) => {
  for (let i = 0; i < cycles; i += 1) {
    await Promise.resolve();
  }
};

describe('useProffieEngine', () => {
  beforeEach(() => {
    hookState.setters.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clears the missing-glue error when init later succeeds', async () => {
    const createProffieEngine = vi.fn().mockResolvedValue({
      HEAPU8: new Uint8Array(),
      cwrap: vi.fn().mockReturnValue(() => 0),
    });

    const windowLike: { createProffieEngine?: unknown } = {};
    let accessCount = 0;
    Object.defineProperty(windowLike, 'createProffieEngine', {
      configurable: true,
      get: () => {
        accessCount += 1;
        return accessCount === 1 ? undefined : createProffieEngine;
      },
    });

    vi.stubGlobal('window', windowLike);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      }),
    );

    useProffieEngine();
    await flushPromises();

    const errorSetter = hookState.setters[1];
    expect(errorSetter).toBeDefined();
    expect(errorSetter).toHaveBeenCalledWith(null);
  });
});
