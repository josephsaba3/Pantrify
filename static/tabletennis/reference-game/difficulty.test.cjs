const { test } = require("node:test");
const assert = require("node:assert/strict");
const { boot } = require("./verify.cjs");
const plain = value => JSON.parse(JSON.stringify(value));
const levels = ["easy", "medium", "hard"];
function rng(seed) { return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296); }
function choose(h, mode, level) {
  h.context.butEventHandler("playFromStart", {});
  h.context.butEventHandler("countryChoice", { id: 0 });
  h.click(mode);
  assert.equal(h.context.gameState, "difficultySelect");
  for (const label of ["Easy", "Medium", "Hard"]) assert.ok(h.flow.innerHTML.includes(label));
  h.click("difficulty", { level });
}
async function start(h, mode, level) {
  choose(h, mode, level);
  if (mode === "finals") h.click("play-final");
  else {
    h.context.butEventHandler("playFromMap", {});
    h.context.butEventHandler("playFromGameIntro", {});
  }
  await h.ticks(4);
  if (h.context.firstRun) h.context.butEventHandler("tickFromTut", {});
  assert.equal(h.context.gameState, "game");
}
function win(h) {
  h.context.oGameData.userScore = 10;
  h.context.oGameData.enemyScore = 0;
  h.context.updateScore("user");
}

test("all levels reach both modes at desktop, portrait, and landscape sizes", async () => {
  for (const size of [[1440, 900], [390, 844], [844, 390]]) {
    for (const mode of ["world", "finals"]) for (const level of levels) {
      const h = await boot(...size);
      h.context.saveDataHandler.setGameData({ cupId: 5, gameId: 3 });
      await start(h, mode, level);
      assert.equal(h.context.enemyBat.difficulty, level);
      assert.equal(h.context.enemyBat.skillLevel, h.context.MatchDifficulty.profiles[level].skill);
      if (mode === "finals") assert.equal(h.context.TableTennisModes.finals.difficulty, level);
      else assert.equal(h.context.oGameData.cupId, 5, "World progression is independent of the opponent level");
      h.context.initPause();
      h.context.butEventHandler("restartFromPause", {});
      await h.ticks(4);
      assert.equal(h.context.enemyBat.difficulty, level, "Restart retains difficulty");
    }
  }
});

test("Finals draws persist separately at each difficulty and survive reload", async () => {
  const memory = new Map(), draws = {};
  const h = await boot(1440, 900, false, memory);
  for (const level of levels) {
    await start(h, "finals", level);
    win(h);
    draws[level] = plain(h.context.TableTennisModes.finals);
    assert.equal(draws[level].round, 1);
  }
  assert.equal(new Set(Object.values(draws).map(draw => draw.id)).size, 3);
  const reload = await boot(390, 844, false, memory);
  assert.equal(reload.context.MatchDifficulty.selected, "hard");
  for (const level of levels) {
    choose(reload, "finals", level);
    assert.deepEqual(plain(reload.context.TableTennisModes.finals), draws[level]);
  }
});

test("old finals saves migrate to Easy without losing the draw or results", async () => {
  const h = await boot(1440, 900);
  const countries = h.context.countryFlags.aIds, id = countries[0], T = h.context.FinalsTournament;
  let legacy = T.create(id, countries, rng(4));
  legacy = T.record(legacy, T.nextMatch(legacy).token, 11, 8, rng(8));
  delete legacy.difficulty;
  const serialized = JSON.stringify(legacy);
  h.context.famobi.localStorage.setItem(`finals32:v1:${id}`, serialized);
  choose(h, "finals", "medium");
  assert.equal(h.context.TableTennisModes.finals.round, 0);
  choose(h, "finals", "easy");
  assert.deepEqual(plain(h.context.TableTennisModes.finals), { ...plain(legacy), difficulty: "easy" });
  assert.equal(h.context.famobi.localStorage.getItem(`finals32:v1:${id}`), serialized);
  assert.ok(h.context.famobi.localStorage.getItem(`finals32:v1:${id}:easy`));
});

test("invalid difficulty values cannot change matches or restore malformed draws", async () => {
  const h = await boot(1440, 900);
  h.context.butEventHandler("playFromStart", {});
  h.context.butEventHandler("countryChoice", { id: 0 });
  h.click("finals");
  for (const level of [undefined, "legend", "__proto__", "toString"]) {
    h.click("difficulty", { level });
    assert.equal(h.context.gameState, "difficultySelect");
  }
  h.click("difficulty", { level: "hard" });
  h.click("difficulty", { level: "easy" });
  assert.equal(h.context.MatchDifficulty.selected, "hard", "A stale second click cannot change an active draw");
  const state = h.context.TableTennisModes.finals;
  state.difficulty = "unknown";
  assert.equal(h.context.FinalsTournament.restore(state, h.context.countryFlags.aIds), null);
});

test("reaction uses game time, pauses correctly, and stays ordered at 30/60/144 FPS", async () => {
  for (const fps of [30, 60, 144]) {
    const elapsed = [];
    for (const level of levels) {
      const h = await boot(1440, 900);
      await start(h, "finals", level);
      const c = h.context, opponent = c.enemyBat;
      c.Math.random = () => 0.5;
      c.ball.lastHit = "user";
      opponent.setBouncePos(0.7, 0.2, 0.5);
      const delay = opponent.pendingReaction.remaining;
      c.famobi.paused = true;
      c.delta = 1;
      opponent.update();
      assert.equal(opponent.pendingReaction.remaining, delay);
      c.famobi.paused = false;
      c.delta = 1 / fps;
      let time = 0;
      while (opponent.pendingReaction && time < 1) { opponent.update(); time += c.delta; }
      assert.ok(time >= delay - 1e-10 && time <= delay + 1 / fps + 1e-10);
      elapsed.push(time);
      opponent.setBouncePos(0, 0.2, 0);
      opponent.resetToCentre();
      assert.equal(opponent.pendingReaction, null, "A new serve clears the previous decision");
    }
    assert.ok(elapsed[0] > elapsed[1] && elapsed[1] > elapsed[2]);
  }
});

test("return pace, spin, and open-space placement increase while player controls stay identical", async () => {
  const totals = [], playerShots = [];
  for (const level of levels) {
    const h = await boot(1440, 900);
    await start(h, "finals", level);
    const c = h.context, opponent = c.enemyBat;
    c.Math.random = rng(420);
    c.ball.servingState = 2;
    c.ball.x = opponent.x;
    Object.assign(c.userBat, { x: c.canvas.width / 2 + 220, y: 600, prevX: c.canvas.width / 2 + 215, prevY: 608 });
    c.delta = 1 / 60;
    playerShots.push(plain(c.userBat.getHitData(0.2, 0.8)));
    const total = { pace: 0, spin: 0, open: 0 };
    for (let i = 0; i < 1000; i++) {
      c.rallyHits = i;
      const shot = opponent.getHitData(0, 0.2);
      const again = opponent.getHitData(0, 0.2);
      assert.deepEqual(plain(again), plain(shot), "Analytics observes the same stroke that was hit");
      assert.ok(shot.speed >= 0.3 && shot.speed <= opponent.profile.paceCap);
      assert.ok(Math.abs(shot.spin) <= opponent.profile.spin);
      assert.ok(shot.y >= 0.65 && shot.y <= 0.99 && Math.abs(shot.x) <= 1.12);
      total.pace += shot.speed;
      total.spin += Math.abs(shot.spin);
      total.open += shot.x < -0.25 ? 1 : 0;
    }
    totals.push(total);
  }
  for (const key of ["pace", "spin", "open"]) assert.ok(totals[0][key] < totals[1][key] && totals[1][key] < totals[2][key], key);
  assert.deepEqual(playerShots[0], playerShots[1]);
  assert.deepEqual(playerShots[1], playerShots[2]);
});

test("opponent motion has a finite speed limit and harder levels cover ground faster", async () => {
  const distances = [];
  for (const level of levels) {
    const h = await boot(1440, 900);
    await start(h, "finals", level);
    const c = h.context, opponent = c.enemyBat, startX = opponent.x;
    opponent.moveTween?.kill();
    opponent.trackBall = true;
    c.ball.lastHit = "user";
    c.ball.x = startX + 240;
    c.delta = 1 / 60;
    for (let frame = 0; frame < 18; frame++) {
      const before = opponent.x;
      opponent.update();
      assert.ok(Math.abs(opponent.x - before) <= opponent.profile.movement / 60 + 1e-9);
    }
    distances.push(opponent.x - startX);
  }
  assert.ok(distances[0] < distances[1] && distances[1] < distances[2]);
});

test("difficulty and separate draws work when browser storage is blocked", async () => {
  const h = await boot(390, 844, true);
  await start(h, "finals", "hard");
  win(h);
  const saved = plain(h.context.TableTennisModes.finals);
  choose(h, "finals", "easy");
  choose(h, "finals", "hard");
  assert.deepEqual(plain(h.context.TableTennisModes.finals), saved);
});

test("harder opponents return more of the same incoming balls through real paddle contact", async t => {
  const totals = [];
  for (const level of levels) {
    const h = await boot(1440, 900);
    await start(h, "finals", level);
    const c = h.context;
    let returned = 0, cases = 0;
    for (const target of [-0.85, -0.45, 0, 0.45, 0.85]) {
      for (const speed of [0.38, 0.48, 0.58]) for (const spin of [0, 0.55]) {
        c.Math.random = rng(17 + cases);
        for (const actor of [c.ball, c.enemyBat, c.tableTop]) c.TweenLite.killTweensOf(actor);
        c.enemyBat = new c.Elements.EnemyBat();
        c.ball = new c.Elements.Ball();
        for (const actor of [c.ball, c.enemyBat, c.tableTop]) c.TweenLite.killTweensOf(actor);
        Object.assign(c.oGameData, { userScore: 0, enemyScore: 0 });
        Object.assign(c.tableTop, { offsetX: 0, offsetY: 0 });
        Object.assign(c.enemyBat, { x: c.canvas.width / 2, targX: 0, targY: 0, slideInc: 0 });
        Object.assign(c.ball, { tablePosX: 0, tablePosY: 0.9, height: 60, servingState: 2, lastHit: "user", bounceNum: 0 });
        c.rallyHits = 0;
        c.ball.setBouncePoint({ x: target, y: 0.15, speed, spin });
        let hit = false;
        const getHit = c.enemyBat.getHitData;
        c.enemyBat.getHitData = function(...args) { hit = true; return getHit.apply(this, args); };
        for (let frame = 0; frame < 180 && !hit && c.oGameData.userScore + c.oGameData.enemyScore === 0; frame++) await h.tick();
        returned += hit ? 1 : 0;
        cases++;
      }
    }
    totals.push(returned);
    t.diagnostic(`${level}: ${returned}/${cases} incoming shots returned`);
  }
  assert.ok(totals[0] < totals[1] && totals[1] < totals[2], `Return coverage must rise with difficulty: ${totals}`);
  assert.ok(totals[2] < 30, "Hard can still be beaten by wide or fast shots");
});
