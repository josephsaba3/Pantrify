// Time game updates from the display's frame timestamps instead of Date.
(() => {
  "use strict";
  // The supplied getDelta reads Date whenever the callback happens to run. On
  // mobile and in Firefox that clock is coarse and callbacks start unevenly, so
  // the ball's per-frame step varies and it stutters. requestAnimationFrame
  // timestamps are aligned to the screen refresh and advance evenly.
  const frame = window.requestAnimFrame;
  const clock = () => (window.performance?.now ? performance.now() : Date.now());
  let frameTime = null;
  window.requestAnimFrame = function(callback) {
    return frame.call(window, time => {
      frameTime = Number.isFinite(time) ? time : clock();
      try { callback(time); } finally { frameTime = null; }
    });
  };
  let last = null;
  let stamp = null;
  window.getDelta = function() {
    const now = frameTime ?? clock();
    let seconds;
    // The game resets previousTime to Date on start, resume and screen changes.
    // Honour that reset with its original Date delta, then follow frame time.
    if (last === null || previousTime !== stamp) seconds = (Date.now() - previousTime) / 1000;
    else seconds = (now - last) / 1000;
    last = now;
    stamp = previousTime = Date.now();
    // Keep the source's rule: skip long stalls rather than jumping the ball.
    return seconds > 0.5 || !(seconds > 0) ? 0 : seconds;
  };
})();
