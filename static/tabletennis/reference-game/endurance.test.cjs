const { test } = require("node:test");
const assert = require("node:assert/strict");
const { boot } = require("./verify.cjs");
const plain = value => JSON.parse(JSON.stringify(value));

function choose(h, mode = "endurance", level = "medium", countryIndex = 0) {
  h.context.butEventHandler("playFromStart", {});
  h.context.butEventHandler("countryChoice", { id: countryIndex });
  assert.match(h.flow.innerHTML, /Endurance/);
  h.click(mode);
  assert.equal(h.context.gameState, "difficultySelect");
  h.click("difficulty", { level });
}
async function play(h) {
  h.click("play-endurance");
  h.click("play-endurance");
  await h.ticks(4);
  const c = h.context;
  assert.equal(c.gameState, "game");
  assert.equal(c.oGameData.userScore, 0);
  assert.equal(c.oGameData.enemyScore, 0);
  assert.notEqual(c.oGameData.enemyId, c.oGameData.userId);
  assert.equal(c.enemyBat.difficulty, c.TableTennisModes.endurance.difficulty);
  if (c.firstRun) c.butEventHandler("tickFromTut", {});
}

for (const [width, height] of [[1440, 900], [390, 844], [844, 390]]) {
  test(`a run continues past 11 and ends on the first lost point (${width}x${height}, simulated DOM)`, async () => {
    const h = await boot(width, height), c = h.context;
    choose(h);
    assert.equal(c.gameState, "enduranceProgress");
    await play(h);
    for (let point = 0; point < 15; point++) c.updateScore("user");
    assert.equal(c.gameState, "game", "Endurance does not stop at 11");
    assert.equal(c.oGameData.userScore, 15);
    assert.equal(c.MatchStats.current.player.longestStreak, 15);
    c.updateScore("enemy");
    assert.equal(c.gameState, "matchStats");
    assert.match(h.flow.innerHTML, /New best run!/);
    assert.match(h.flow.innerHTML, /15 points in a row/);
    assert.doesNotMatch(h.flow.innerHTML, /undefined|NaN|Longest point streak|Match points saved/);
    const saved = plain(c.TableTennisModes.endurance);
    assert.equal(saved.best, 15);
    assert.equal(saved.runs, 1);
    c.initGameComplete();
    assert.deepEqual(plain(c.TableTennisModes.endurance), saved, "Duplicate completion is harmless");
    h.click("continue-result");
    assert.equal(c.gameState, "enduranceProgress");
    assert.match(h.flow.innerHTML, /Last run: 15 points/);
    await play(h);
    for (let point = 0; point < 3; point++) c.updateScore("user");
    c.updateScore("enemy");
    assert.match(h.flow.innerHTML, /Run over/);
    assert.equal(c.TableTennisModes.endurance.best, 15);
    assert.equal(c.TableTennisModes.endurance.last, 3);
  });
}

test("endurance runs never change all-time totals, point streaks or match streaks", async () => {
  const h = await boot(1440, 900), c = h.context;
  choose(h, "finals", "medium");
  h.click("play-final");
  await h.ticks(4);
  if (c.firstRun) c.butEventHandler("tickFromTut", {});
  for (let point = 0; point < 11; point++) c.updateScore("user");
  assert.equal(c.gameState, "matchStats");
  const before = plain(c.MatchStats.totals);
  assert.deepEqual(before.pointRun, { side: "player", length: 11 });
  assert.deepEqual(before.matchRun, { side: "player", length: 1 });
  choose(h);
  await play(h);
  for (let point = 0; point < 20; point++) c.updateScore("user");
  c.updateScore("enemy");
  assert.equal(c.gameState, "matchStats");
  assert.deepEqual(plain(c.MatchStats.totals), before, "A lost run neither breaks nor extends streaks");
  h.click("continue-result");
  await play(h);
  c.updateScore("enemy");
  assert.equal(c.TableTennisModes.endurance.last, 0);
  assert.deepEqual(plain(c.MatchStats.totals), before);
  h.click("home");
  h.click("stats");
  assert.match(h.flow.innerHTML, /Endurance runs/);
});

test("no match-point banner shows during a run", async () => {
  const h = await boot(1440, 900), c = h.context;
  choose(h);
  await play(h);
  const banner = h.wrapper.children.find(child => child.id === "match-point-label");
  for (let point = 0; point < 12; point++) {
    Object.assign(c.ball, { statsServer: "user", statsLastShot: "user", lastHit: "user", bounceNum: 1, ballShortState: 0 });
    c.updateScore("user");
    assert.equal(banner.hidden, true, `No banner at ${c.oGameData.userScore}-0`);
  }
  c.MatchStats.announce();
  assert.equal(banner.hidden, true);
  assert.equal(banner.textContent, "");
});

test("pause, restart and quit keep the saved best and restart from 0–0", async () => {
  const h = await boot(1440, 900), c = h.context;
  choose(h, "endurance", "hard");
  await play(h);
  for (let point = 0; point < 4; point++) c.updateScore("user");
  c.initPause();
  c.butEventHandler("playFromPause", {});
  await h.ticks(3);
  assert.equal(c.oGameData.userScore, 4);
  c.initPause();
  c.butEventHandler("restartFromPause", {});
  await h.ticks(4);
  assert.equal(c.oGameData.userScore, 0);
  assert.equal(c.oGameData.enemyScore, 0);
  assert.equal(c.enemyBat.difficulty, "hard");
  for (let point = 0; point < 12; point++) c.updateScore("user");
  assert.equal(c.gameState, "game", "The restarted run still lifts the 11-point finish");
  c.initPause();
  c.butEventHandler("quitFromPause", {});
  assert.equal(c.gameState, "enduranceProgress");
  assert.deepEqual(plain(c.TableTennisModes.endurance), { version: 1, best: 0, runs: 0, last: null, playerId: c.oGameData.userId, difficulty: "hard" });
  assert.equal(c.MatchStats.totals.matches, 0);
});

test("a perfect run stops at the source's 99-point cap", async () => {
  const h = await boot(1440, 900), c = h.context;
  choose(h);
  await play(h);
  for (let point = 0; point < 120 && c.gameState === "game"; point++) c.updateScore("user");
  assert.equal(c.gameState, "matchStats");
  assert.equal(c.oGameData.userScore, 99);
  assert.equal(c.TableTennisModes.endurance.best, 99);
  assert.equal(c.MatchStats.totals.matches, 0);
});

test("bests save per country and difficulty, reload, and never leak into other modes", async () => {
  const memory = new Map(), h = await boot(1440, 900, false, memory), c = h.context;
  choose(h);
  await play(h);
  for (let point = 0; point < 7; point++) c.updateScore("user");
  c.updateScore("enemy");
  const saved = plain(c.TableTennisModes.endurance);
  choose(h, "endurance", "easy");
  assert.equal(c.TableTennisModes.endurance.best, 0);
  choose(h, "endurance", "medium", 1);
  assert.equal(c.TableTennisModes.endurance.best, 0);
  const reload = await boot(390, 844, false, memory), r = reload.context;
  r.butEventHandler("playFromStart", {});
  r.butEventHandler("countryChoice", { id: 0 });
  reload.click("endurance");
  assert.match(reload.flow.innerHTML, /Best run: 7/);
  reload.click("difficulty", { level: "medium" });
  assert.deepEqual(plain(r.TableTennisModes.endurance), saved);
  choose(reload, "finals", "medium");
  reload.click("play-final");
  await reload.ticks(4);
  if (r.firstRun) r.butEventHandler("tickFromTut", {});
  for (let point = 0; point < 11; point++) r.updateScore("user");
  assert.equal(r.gameState, "matchStats", "Finals keep first-to-11 scoring");
});

test("blocked or write-failing storage keeps the best for the current session", async () => {
  for (const blocked of [false, true]) {
    const h = await boot(390, 844, blocked);
    choose(h);
    if (!blocked) h.memory.set = () => { throw new Error("QuotaExceededError"); };
    await play(h);
    h.context.updateScore("user");
    h.context.updateScore("enemy");
    choose(h);
    assert.equal(h.context.TableTennisModes.endurance.best, 1);
  }
});
