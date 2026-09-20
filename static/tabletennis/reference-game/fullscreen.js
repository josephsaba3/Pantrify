// Request browser fullscreen while the initiating click still has user activation.
(() => {
  "use strict";
  const root = document.documentElement;
  const request = root.requestFullscreen || root.webkitRequestFullscreen;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  const supported = typeof request === "function" && typeof exit === "function" &&
    document.fullscreenEnabled !== false && document.webkitFullscreenEnabled !== false;
  let pending = false;
  let autoEnter = true;
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
      if (entering) autoEnter = false;
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
    if (active()) autoEnter = false;
    sync();
    const message = document.querySelector('[data-fullscreen-status]');
    if (message) message.textContent = "";
    // Use the original game's resize path on both entry and Escape/exit.
    window.resizeCanvas?.();
  }
  document.addEventListener("fullscreenchange", changed);
  document.addEventListener("webkitfullscreenchange", changed);
  function enter() { return autoEnter ? change(true) : Promise.resolve(false); }
  function gesture(event) {
    if (!event.isTrusted || event.ctrlKey || event.altKey || event.metaKey || event.button > 0) return;
    if (event.type === "pointerdown" && event.pointerType !== "mouse") return;
    if (event.type === "pointerup" && event.pointerType === "mouse") return;
    if (event.type === "keydown" && (event.repeat || !["Enter", " "].includes(event.key))) return;
    // The explicit toggle owns its gesture, otherwise entry could turn its
    // following click into an exit. Leave links and editable controls alone.
    if (event.target?.closest?.('[data-action="fullscreen"], a, input, textarea, select, [contenteditable="true"]')) return;
    void enter();
  }
  // Capture genuine input before the copied game's canvas handlers consume it.
  // Mouse presses activate immediately; touch/pen activate on release. Click
  // also covers keyboard activation and browsers without pointer events.
  for (const name of ["pointerdown", "pointerup", "touchend", "click", "keydown"]) {
    document.addEventListener(name, gesture, { capture: true, passive: true });
  }
  window.GameFullscreen = { supported, sync, enter, toggle: () => change(!active(), true) };
  // Use an existing gesture if one is still active; never request fullscreen
  // from an unactivated page load, which Firefox must reject.
  if (window.navigator?.userActivation?.isActive) void enter();
})();
