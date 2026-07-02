import type { StateStorage } from 'zustand/middleware';

// IndexedDB-backed persistence for the zustand save file, with a one-time
// migration from the original localStorage key. localStorage caps out around
// 5MB and is first in line for browser cleanups; IndexedDB gets a far larger
// quota and sturdier eviction rules. The old localStorage entry is deliberately
// left in place after migration as a frozen point-in-time backup.

export interface KvBackend {
  get(key: string): Promise<string | null | undefined>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
}

export interface LegacyStringStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createMigratingStateStorage(
  kv: KvBackend,
  legacy: LegacyStringStore | null,
): StateStorage {
  return {
    async getItem(name) {
      try {
        const value = await kv.get(name);
        if (value != null) return value;
        const legacyValue = legacy?.getItem(name) ?? null;
        if (legacyValue != null) {
          await kv.set(name, legacyValue); // copy forward; never delete the original
          return legacyValue;
        }
        return null;
      } catch {
        // IndexedDB blocked (private mode, quota, etc.) — run on localStorage.
        return legacy?.getItem(name) ?? null;
      }
    },
    async setItem(name, value) {
      try {
        await kv.set(name, value);
      } catch {
        legacy?.setItem(name, value);
      }
    },
    async removeItem(name) {
      try {
        await kv.del(name);
      } catch {
        // nothing sensible to do — removal is best-effort
      }
    },
  };
}

// ---- Browser glue (untestable in node jest; kept deliberately thin) ----

const DB_NAME = 'life-os';
const STORE_NAME = 'kv';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  if (typeof indexedDB === 'undefined') throw new Error('indexedDB unavailable');
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const req = run(tx.objectStore(STORE_NAME));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('indexedDB request failed'));
    });
  } finally {
    db.close();
  }
}

const idbKv: KvBackend = {
  get: (key) => withStore('readonly', (s) => s.get(key) as IDBRequest<string | undefined>),
  set: (key, value) => withStore('readwrite', (s) => s.put(value, key)).then(() => undefined),
  del: (key) => withStore('readwrite', (s) => s.delete(key)).then(() => undefined),
};

const legacyLocalStorage: LegacyStringStore = {
  getItem: (key) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(key)),
  setItem: (key, value) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
};

export const lifeOsStateStorage = createMigratingStateStorage(idbKv, legacyLocalStorage);
