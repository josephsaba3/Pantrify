// Local hosting adapter. The supplied game bundle is kept unchanged.
(() => {
  "use strict";
  const requests = new Map();
  function storage(kind) {
    const fallback = new Map();
    const pending = new Set();
    const prefix = "table-tennis-reference:";
    return {
      getItem(key) {
        key = String(key);
        if (pending.has(key)) return fallback.get(key) ?? null;
        try {
          const value = window[kind].getItem(prefix + key);
          fallback.set(key, value);
          return value;
        } catch { return fallback.get(key) ?? null; }
      },
      setItem(key, value) {
        key = String(key);
        fallback.set(key, String(value));
        try { window[kind].setItem(prefix + key, String(value)); pending.delete(key); }
        catch { pending.add(key); }
      },
      removeItem(key) {
        key = String(key);
        fallback.set(key, null);
        try { window[kind].removeItem(prefix + key); pending.delete(key); }
        catch { pending.add(key); }
      }
    };
  }
  const resolved = () => Promise.resolve();
  window.fenster = window;
  window.famobi = {
    config: { aid: "LOCAL", features: { lockPointer: false } },
    paused: false,
    started: false,
    localStorage: storage("localStorage"),
    sessionStorage: storage("sessionStorage"),
    hasFeature: () => false,
    getFeatureProperties: () => ({ state: {}, override: {} }),
    getVolume: () => 1,
    getBrandingButtonImage: () => "images/BrandingPlaceholderButton.png",
    onRequest(name, callback) { requests.set(name, callback); },
    gameReady() {
      const loading = document.getElementById("local-loading");
      if (loading) loading.hidden = true;
    },
    playerReady() { window.famobi.started = true; },
    setPreloadProgress() {},
    moreGamesLink() { window.open("https://famobi.com/", "_blank", "noopener,noreferrer"); }
  };
  window.famobi_analytics = {
    trackEvent: resolved,
    trackScreen: resolved,
    trackStats: resolved
  };
  for (const name of [
    "EVENT_LEVELSTART", "EVENT_LEVELRESTART", "EVENT_LEVELFAIL", "EVENT_LEVELSUCCESS",
    "EVENT_TUTORIALCOMPLETED", "SCREEN_HOME", "SCREEN_CREDITS", "SCREEN_LEVEL",
    "SCREEN_LEVELINTRO", "SCREEN_LEVELRESULT", "SCREEN_PAUSE"
  ]) window.famobi_analytics[name] = name;
})();
