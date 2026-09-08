// Keep play available when a browser blocks storage for local files.
(() => {
  "use strict";
  const memory = new Map();
  window.RallyEleven ??= {};
  window.RallyEleven.storage = {
    getItem(key) {
      try { return localStorage.getItem(key) ?? memory.get(key) ?? null; }
      catch { return memory.get(key) ?? null; }
    },
    setItem(key, value) {
      memory.set(key, String(value));
      try { localStorage.setItem(key, value); } catch { /* Session-only fallback. */ }
    },
    removeItem(key) {
      memory.delete(key);
      try { localStorage.removeItem(key); } catch { /* Session-only fallback. */ }
    },
  };
})();
