import { createMigratingStateStorage } from '../persistStorage';
import type { KvBackend, LegacyStringStore } from '../persistStorage';

function makeKv(initial: Record<string, string> = {}): KvBackend & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    get: jest.fn(async (k: string) => (k in data ? data[k] : null)),
    set: jest.fn(async (k: string, v: string) => {
      data[k] = v;
    }),
    del: jest.fn(async (k: string) => {
      delete data[k];
    }),
  };
}

function makeLegacy(initial: Record<string, string> = {}): LegacyStringStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: jest.fn((k: string) => (k in data ? data[k] : null)),
    setItem: jest.fn((k: string, v: string) => {
      data[k] = v;
    }),
  };
}

const KEY = 'life-os-storage';

describe('createMigratingStateStorage', () => {
  it('returns the IndexedDB value when present, without touching legacy storage', async () => {
    const kv = makeKv({ [KEY]: '{"a":1}' });
    const legacy = makeLegacy({ [KEY]: '{"old":true}' });
    const storage = createMigratingStateStorage(kv, legacy);

    await expect(storage.getItem(KEY)).resolves.toBe('{"a":1}');
    expect(legacy.getItem).not.toHaveBeenCalled();
  });

  it('migrates the legacy localStorage save into IndexedDB on first read, leaving the original intact', async () => {
    const kv = makeKv();
    const legacy = makeLegacy({ [KEY]: '{"save":"game"}' });
    const storage = createMigratingStateStorage(kv, legacy);

    await expect(storage.getItem(KEY)).resolves.toBe('{"save":"game"}');
    expect(kv.data[KEY]).toBe('{"save":"game"}'); // copied forward
    expect(legacy.data[KEY]).toBe('{"save":"game"}'); // NOT deleted — kept as backup
  });

  it('returns null when neither backend has a value', async () => {
    const storage = createMigratingStateStorage(makeKv(), makeLegacy());
    await expect(storage.getItem(KEY)).resolves.toBeNull();
  });

  it('writes to IndexedDB only', async () => {
    const kv = makeKv();
    const legacy = makeLegacy();
    const storage = createMigratingStateStorage(kv, legacy);

    await storage.setItem(KEY, '{"b":2}');

    expect(kv.data[KEY]).toBe('{"b":2}');
    expect(legacy.setItem).not.toHaveBeenCalled();
  });

  it('falls back to legacy reads and writes when IndexedDB is unavailable', async () => {
    const broken: KvBackend = {
      get: jest.fn(async () => {
        throw new Error('idb blocked');
      }),
      set: jest.fn(async () => {
        throw new Error('idb blocked');
      }),
      del: jest.fn(async () => {
        throw new Error('idb blocked');
      }),
    };
    const legacy = makeLegacy({ [KEY]: '{"save":"game"}' });
    const storage = createMigratingStateStorage(broken, legacy);

    await expect(storage.getItem(KEY)).resolves.toBe('{"save":"game"}');
    await storage.setItem(KEY, '{"save":"v2"}');
    expect(legacy.data[KEY]).toBe('{"save":"v2"}');
  });

  it('removeItem deletes from IndexedDB', async () => {
    const kv = makeKv({ [KEY]: 'x' });
    const storage = createMigratingStateStorage(kv, makeLegacy());

    await storage.removeItem(KEY);

    expect(KEY in kv.data).toBe(false);
  });
});
