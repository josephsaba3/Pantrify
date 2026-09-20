// Request browser fullscreen while the initiating click still has user activation.
(() => {
  "use strict";
  const root = document.documentElement;
  const request = root.requestFullscreen || root.webkitRequestFullscreen;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  const supported = typeof request === "function" && typeof exit === "function" &&
    document.fullscreenEnabled !== false && document.webkitFullscreenEnabled !== false;
  let pending = false;
  const active = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  function sync() {
    for (const button of document.querySelectorAll('[data-action="fullscreen"]')) {
      button.textContent = active() ? "Exit full screen" : "Full screen";
      button.setAttribute("aria-pressed", String(active()));
      button.disabled = pending || !supported;
    }
  }
  async function change(entering, reportFailure = false) {
    if (pending || !supported || active() === entering) return false;
    pending = true;
    sync();
    try {
      // Fullscreen the document so the court, menus and results all stay visible.
      // Call immediately, before awaiting anything or starting the game's transitions.
      await (entering ? request.call(root) : exit.call(document));
      return true;
    } catch {
      if (reportFailure) {
        const message = document.querySelector('[data-fullscreen-status]');
        if (message) message.textContent = "Full screen was blocked. Try again, or use your browser's fullscreen command.";
      }
      return false;
    } finally {
      pending = false;
      sync();
    }
  }
  function changed() {
    sync();
    const message = document.querySelector('[data-fullscreen-status]');
    if (message) message.textContent = "";
    // Use the original game's resize path on both entry and Escape/exit.
    window.resizeCanvas?.();
  }
  document.addEventListener("fullscreenchange", changed);
  document.addEventListener("webkitfullscreenchange", changed);
  window.GameFullscreen = { supported, sync, enter: () => change(true), toggle: () => change(!active(), true) };
})();
