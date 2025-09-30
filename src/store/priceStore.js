// External store siêu nhẹ cho useSyncExternalStore
export function createStore() {
  let listeners = new Set();
  const state = {
    cache: new Map(),  // mutable
    snapshot: {},      // immutable
  };

  const emit = () => {
    const next = Object.create(null);
    state.cache.forEach((v, k) => (next[k] = v));
    state.snapshot = next;
    listeners.forEach((l) => l());
  };

  return {
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSnapshot() {
      return state.snapshot;
    },
    applyBatch(entries) {
      for (const [k, v] of entries) state.cache.set(k, v);
      emit();
    },
    peek(key) {
      return state.cache.get(key);
    },
  };
}
