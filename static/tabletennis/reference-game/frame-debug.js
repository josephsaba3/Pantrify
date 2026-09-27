// Opt-in frame diagnostics for on-device testing: add ?debug to the URL.
(() => {
  "use strict";
  if (!/[?&]debug\b/.test(location.search)) return;
  const WINDOW_MS = 5000;
  const frames = []; // { t, gap, delta, cost, step, spike }
  const events = [];
  let lastFrame = null, lastBall = null, prevStep = 0, totalSpikes = 0, totalSlow = 0, worstGap = 0;
  const note = name => events.push({ t: performance.now(), name });
  for (const name of ["resize", "blur", "focus", "orientationchange"]) addEventListener(name, () => note(name));
  for (const name of ["visibilitychange", "fullscreenchange"]) document.addEventListener(name, () => note(name));

  const originalDelta = window.getDelta;
  let lastDelta = 0;
  window.getDelta = function() { return (lastDelta = originalDelta.call(this)); };

  const originalUpdate = window.updateGameEvent;
  window.updateGameEvent = function(...args) {
    const start = performance.now();
    const result = originalUpdate.apply(this, args);
    if (gameState !== "game" || !window.ball) return result;
    const cost = performance.now() - start;
    const gap = lastFrame === null ? 0 : start - lastFrame;
    lastFrame = start;
    const step = lastBall ? Math.hypot(ball.x - lastBall.x, ball.y - lastBall.y) : 0;
    const sameShot = lastBall && lastBall.hit === ball.lastHit && lastBall.state === ball.servingState;
    // A ball step far larger than the previous one, within the same shot, is a visible jump.
    const spike = Boolean(sameShot && prevStep > 0 && step > 2.5 * prevStep + 4);
    lastBall = { x: ball.x, y: ball.y, hit: ball.lastHit, state: ball.servingState };
    prevStep = step;
    if (gap > 25) totalSlow++;
    if (spike) totalSpikes++;
    worstGap = Math.max(worstGap, gap);
    frames.push({ t: start, gap, delta: lastDelta * 1000, cost, step, spike });
    while (frames.length && frames[0].t < start - WINDOW_MS) frames.shift();
    return result;
  };

  const hud = document.createElement("div");
  hud.style.cssText = "position:fixed;left:4px;bottom:4px;z-index:9;pointer-events:none;font:11px/1.3 monospace;color:#0f0;background:rgba(0,0,0,.7);padding:4px 6px;border-radius:4px;white-space:pre";
  const graph = document.createElement("canvas");
  graph.width = 200; graph.height = 40;
  graph.style.cssText = "display:block;margin-top:3px";
  const text = document.createElement("div");
  hud.append(text, graph);
  document.body.appendChild(hud);
  const g = graph.getContext("2d");
  const fmt = n => n.toFixed(1).padStart(5);
  setInterval(() => {
    const now = performance.now();
    while (events.length && events[0].t < now - 30000) events.shift();
    if (!frames.length) { text.textContent = `debug: waiting for a match (${gameState})`; return; }
    const gaps = frames.map(f => f.gap).filter(Boolean);
    const deltas = frames.map(f => f.delta);
    const fps = gaps.length ? 1000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0;
    const recent = events.slice(-4).map(e => `${e.name}@-${((now - e.t) / 1000).toFixed(0)}s`).join(" ");
    text.textContent =
      `fps ${fmt(fps)}  gap max ${fmt(Math.max(0, ...gaps))}ms\n` +
      `delta ${fmt(Math.min(...deltas))}-${fmt(Math.max(...deltas))}ms  update max ${fmt(Math.max(...frames.map(f => f.cost)))}ms\n` +
      `slow>25ms 5s:${gaps.filter(v => v > 25).length} all:${totalSlow}  worst ${worstGap.toFixed(0)}ms\n` +
      `ball jumps 5s:${frames.filter(f => f.spike).length} all:${totalSpikes}\n` +
      `canvas ${canvas.width}x${canvas.height} dpr ${devicePixelRatio}\n` +
      `events ${recent || "none"}`;
    // Frame gap graph: green under 20ms, amber under 34ms, red above. Ball jumps marked in magenta.
    g.clearRect(0, 0, 200, 40);
    const shown = frames.slice(-200);
    shown.forEach((f, i) => {
      const h = Math.min(40, f.gap);
      g.fillStyle = f.spike ? "#f0f" : f.gap < 20 ? "#0c0" : f.gap < 34 ? "#fb0" : "#f33";
      g.fillRect(i, 40 - h, 1, h);
    });
    g.fillStyle = "rgba(255,255,255,.4)";
    g.fillRect(0, 40 - 16.7, 200, 1);
  }, 500);
})();
