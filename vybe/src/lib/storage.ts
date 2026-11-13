import { createStore, del, get, set } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

/** IndexedDB-backed storage for Zustand persist. Falls back to memory if IndexedDB is unavailable. */
const memory = new Map<string, string>();
let store: ReturnType<typeof createStore> | null = null;
function idb() {
  if (store) return store;
  try {
    if (typeof indexedDB === 'undefined') return null;
    store = createStore('vybe-db', 'kv');
    return store;
  } catch {
    return null;
  }
}

export const idbStorage: StateStorage = {
  async getItem(name) {
    const s = idb();
    if (!s) return memory.get(name) ?? null;
    try {
      return (await get<string>(name, s)) ?? null;
    } catch {
      return memory.get(name) ?? null;
    }
  },
  async setItem(name, value) {
    const s = idb();
    memory.set(name, value);
    if (s) await set(name, value, s).catch(() => undefined);
  },
  async removeItem(name) {
    const s = idb();
    memory.delete(name);
    if (s) await del(name, s).catch(() => undefined);
  },
};
