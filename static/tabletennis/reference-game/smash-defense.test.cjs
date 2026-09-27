const { test } = require("node:test");
const assert = require("node:assert/strict");
const { boot } = require("./verify.cjs");
const levels = ["easy", "medium", "challenging", "hard"];
// Keep the previous defensive settings as a comparison, using the same
// physics, opponent shot generation and seeded incoming shots in both runs.
const previous = {
  easy: { reaction: 0.20, reactionVariation: 0.08, travel: 0.94, tracking: 1.0, movement: 460, recovery: 0.94, readjustAt: 0.10 },
  medium: { reaction: 0.105, reactionVariation: 0.065, travel: 1.17, tracking: 1.28, movement: 650, recovery: 1.14, readjustAt: 0.20 },
  challenging: { reaction: 0.055, reactionVariation: 0.045, travel: 1.40, tracking: 1.54, movement: 780, recovery: 1.34, readjustAt: 0.28 },
  hard: { reaction: 0.025, reactionVariation: 0.035, travel: 1.48, tracking: 1.65, movement: 840, recovery: 1.42, readjustAt: 0.32 }
};
function rng(seed) { return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296); }
async function start(level, fps) {
  const h = await boot(1440, 900), c = h.context;
  c.PaddleTypes.select("speedy");
  c.butEventHandler("playFromStart", {});
  c.butEventHandler("countryChoice", { id: 0 });
  h.click("finals");
  h.click("difficulty", { level });
  h.click("play-final");
  await h.ticks(4);
  if (c.firstRun) c.butEventHandler("tickFromTut", {});
  assert.equal(c.gameState, "game");
  c.delta = 1 / fps;
  return h;
}
async function returns(h, level, fps, oldSettings) {
  const c = h.context;
  let hits = 0, cases = 0;
  for (const seed of [17, 83, 149]) for (const offset of [-200, 0, 200]) {
    for (const target of [-0.95, -0.45, 0, 0.45, 0.95]) for (const power of [0.75, 1]) {
      c.Math.random = rng(seed + cases % 30);
      for (const actor of [c.ball, c.enemyBat, c.tableTop]) c.TweenLite.killTweensOf(actor);
      c.enemyBat = new c.Elements.EnemyBat();
      if (oldSettings) c.enemyBat.profile = { ...c.enemyBat.profile, ...previous[level] };
      c.ball = new c.Elements.Ball();
      for (const actor of [c.ball, c.enemyBat, c.tableTop]) c.TweenLite.killTweensOf(actor);
      Object.assign(c.oGameData, { userScore: 0, enemyScore: 0 });
      Object.assign(c.tableTop, { offsetX: 0, offsetY: 0 });
      Object.assign(c.enemyBat, { x: c.canvas.width / 2 + offset, targX: offset, targY: 0, slideInc: 0 });
      Object.assign(c.ball, { tablePosX: 0, tablePosY: 0.9, height: 60, servingState: 2, lastHit: "user", bounceNum: 0 });
      c.rallyHits = 0;
      c.delta = 1 / fps;
      // Generate a real Speedy stroke, including its coupled depth and pace,
      // rather than hand-authoring an arbitrary ball velocity.
      const lateral = target * 3500 / (target < 0 ? 1 : 1.2);
      Object.assign(c.userBat, { x: c.canvas.width / 2, y: 600,
        prevX: c.canvas.width / 2 - lateral / fps, prevY: 600 + power * 4500 / fps });
      const shot = c.userBat.getHitData(0, 0.9);
      assert.ok(shot.speed >= 0.546 - 1e-10 && shot.speed <= 0.624 + 1e-10);
      c.ball.setBouncePoint(shot);
      let hit = false;
      const getHit = c.enemyBat.getHitData;
      c.enemyBat.getHitData = function(...args) { hit = true; return getHit.apply(this, args); };
      for (let frame = 0; frame < fps * 3 && !hit && c.oGameData.userScore + c.oGameData.enemyScore === 0; frame++) {
        await h.tick(1000 / fps);
      }
      hits += hit ? 1 : 0;
      cases++;
    }
  }
  return { hits, cases };
}
for (const fps of [30, 60, 144]) test(`all levels defend more Speedy smashes at ${fps} FPS without becoming unbeatable`, async t => {
  const totals = [];
  for (const level of levels) {
    const h = await start(level, fps);
    const before = await returns(h, level, fps, true);
    const after = await returns(h, level, fps, false);
    t.diagnostic(`${level}: ${before.hits} -> ${after.hits}/${after.cases} Speedy shots returned`);
    assert.ok(after.hits > before.hits, `${level} must improve actual contact on the same shots`);
    totals.push(after.hits);
  }
  assert.ok(totals.every((n, i) => i === 0 || totals[i - 1] < n), `Difficulty must increase: ${totals}`);
  assert.ok(totals.at(-1) < 90, "Even Hard can still be beaten by a well-placed smash");
});
