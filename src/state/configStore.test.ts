import { afterEach, describe, expect, it, vi } from 'vitest';

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
