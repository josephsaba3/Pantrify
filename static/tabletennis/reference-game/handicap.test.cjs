const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { boot } = require("./verify.cjs");
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "handicap-challenge.js"), "utf8"), sandbox);
const H = sandbox.window.HandicapChallenge;
const countries = [0, 5, 12, 53];
const plain = value => JSON.parse(JSON.stringify(value));
function nextResult(state, won) {
  const cpu = H.nextMatch(state).startingScore;
  return H.record(state, H.nextMatch(state).token, won ? Math.max(11, cpu + 2) : 0, won ? cpu : 11);
}

test("five wins progress exactly through 6, 7, 8, 9, 10 and complete the challenge", () => {
  for (const difficulty of ["easy", "medium", "challenging", "hard"]) {
    let state = H.create(0, countries, difficulty, () => 0.5);
    const opponent = state.opponentId;
    assert.notEqual(opponent, 0);
    for (const cpuScore of [6, 7, 8, 9, 10]) {
      assert.equal(H.nextMatch(state).startingScore, cpuScore);
      assert.equal(state.opponentId, opponent);
      const before = plain(state);
      const updated = nextResult(state, true);
      assert.deepEqual(plain(state), before, "Recording does not mutate prior progress");
      state = H.restore(JSON.stringify(updated), countries);
      assert.ok(state, "Progress restores after every stage");
    }
    assert.equal(state.status, "complete");
    assert.equal(state.wins.length, 5);
    assert.equal(state.attempts, 5);
    assert.equal(H.nextMatch(state), null);
  }
});

test("losses allow a retry at every stage and old result tokens cannot advance progress", () => {
  let state = H.create(0, countries, "medium");
  for (let stage = 0; stage < 5; stage++) {
    const token = H.nextMatch(state).token;
    state = nextResult(state, false);
    assert.equal(state.stage, stage);
    assert.equal(state.status, "active");
    assert.notEqual(H.nextMatch(state).token, token);
    assert.throws(() => H.record(state, token, 12, 10));
    assert.ok(H.restore(state, countries));
    state = nextResult(state, true);
  }
  assert.equal(state.attempts, 10);
});

test("scores preserve the CPU head start, deuce rules, and original 99-point cap", () => {
  let state = H.create(0, countries, "easy");
  for (let stage = 0; stage < 4; stage++) state = nextResult(state, true);
  const token = H.nextMatch(state).token;
  for (const score of [[11, 9], [11, 10], [10, 10], [5, 10], [12, 8], [100, 98], [12.5, 10]]) {
    assert.throws(() => H.record(state, token, ...score));
  }
  for (const score of [[12, 10], [18, 16], [99, 98], [98, 99], [0, 11]]) {
    assert.ok(H.restore(H.record(state, token, ...score), countries));
  }
});

test("malformed or incompatible saves are rejected", () => {
  const original = H.create(0, countries, "easy");
  const mutations = [
    value => { value.opponentId = value.playerId; },
    value => { value.playerId = 900; },
    value => { value.difficulty = "legend"; },
    value => { value.stage = 5; },
    value => { value.stage = 1; },
    value => { value.status = "complete"; },
    value => { value.attempts = -1; },
    value => { value.attempts = 1; },
    value => { value.wins.push({ stage: 0, playerScore: 11, cpuScore: 5 }); }
  ];
  for (const mutate of mutations) {
    const state = plain(original); mutate(state);
    assert.equal(H.restore(state, countries), null);
  }
  for (const input of [null, undefined, "{", "null", "[]"]) assert.equal(H.restore(input, countries), null);
});

function choose(h, mode = "handicap", level = "medium", countryIndex = 0) {
  h.context.butEventHandler("playFromStart", {});
  h.context.butEventHandler("countryChoice", { id: countryIndex });
  assert.match(h.flow.innerHTML, /CPU Handicap/);
  h.click(mode);
  assert.equal(h.context.gameState, "difficultySelect");
  h.click("difficulty", { level });
}
async function play(h) {
  const next = h.context.HandicapChallenge.nextMatch(h.context.TableTennisModes.handicap);
  h.click("play-handicap");
  h.click("play-handicap");
  await h.ticks(4);
  const c = h.context;
  assert.equal(c.gameState, "game");
  assert.equal(c.oGameData.userScore, 0);
  assert.equal(c.oGameData.enemyScore, next.startingScore);
  assert.equal(c.oGameData.enemyId, next.opponentId);
  assert.equal(c.enemyBat.difficulty, c.TableTennisModes.handicap.difficulty);
  if (c.firstRun) c.butEventHandler("tickFromTut", {});
}
function score(h, winner) {
  const c = h.context;
  for (let points = 0; points < 100 && c.gameState === "game"; points++) c.updateScore(winner);
  assert.equal(c.gameState, "matchStats");
  const result = plain(c.TableTennisModes.handicap);
  c.initGameComplete();
  assert.deepEqual(plain(c.TableTennisModes.handicap), result, "Duplicate completion is harmless");
  h.click("continue-result");
  assert.equal(c.gameState, "handicapProgress");
}

for (const [width, height] of [[1440, 900], [390, 844], [844, 390]]) {
  test(`complete all five stages through the real score handler (${width}x${height}, simulated DOM)`, async () => {
    const h = await boot(width, height);
    choose(h);
    for (let stage = 0; stage < 5; stage++) {
      assert.equal(h.context.TableTennisModes.handicap.stage, stage);
      assert.match(h.flow.innerHTML, new RegExp(`Play from 0–${stage + 6}`));
      await play(h);
      if (stage === 4) {
        for (let point = 0; point < 11; point++) h.context.updateScore("user");
        assert.equal(h.context.gameState, "game", "11-10 does not win the final stage");
      }
      score(h, "user");
      assert.doesNotMatch(h.flow.innerHTML, /undefined|NaN/);
      await h.ticks(3);
    }
    const completed = h.context.TableTennisModes.handicap;
    assert.equal(completed.status, "complete");
    assert.deepEqual(plain(completed.wins.map(win => [win.playerScore, win.cpuScore])), [[11, 6], [11, 7], [11, 8], [11, 9], [12, 10]]);
    assert.match(h.flow.innerHTML, /Handicap challenge complete!/);
    h.click("new-handicap");
    assert.equal(h.context.TableTennisModes.handicap.stage, 0);
    assert.notEqual(h.context.TableTennisModes.handicap.id, completed.id);
    await play(h);
  });
}

test("loss, pause/resume, restart, and quit preserve the current handicap and opponent", async () => {
  const h = await boot(1440, 900);
  choose(h, "handicap", "hard");
  await play(h);
  score(h, "user");
  await play(h);
  score(h, "enemy");
  const c = h.context, saved = plain(c.TableTennisModes.handicap);
  assert.equal(saved.stage, 1);
  assert.equal(saved.attempts, 2);
  assert.match(h.flow.innerHTML, /Retry from 0–7/);
  await play(h);
  c.updateScore("user");
  c.initPause();
  c.butEventHandler("playFromPause", {});
  await h.ticks(3);
  assert.equal(c.oGameData.userScore, 1);
  assert.equal(c.oGameData.enemyScore, 7);
  c.initPause();
  c.butEventHandler("restartFromPause", {});
  await h.ticks(4);
  assert.equal(c.oGameData.userScore, 0);
  assert.equal(c.oGameData.enemyScore, 7);
  assert.equal(c.enemyBat.difficulty, "hard");
  assert.equal(c.oGameData.enemyId, saved.opponentId);
  c.initPause();
  c.butEventHandler("quitFromPause", {});
  assert.equal(c.gameState, "handicapProgress");
  assert.deepEqual(plain(c.TableTennisModes.handicap), saved);
  await play(h);
});

test("country/level progress reloads separately and head starts never leak into World or Finals", async () => {
  const memory = new Map(), h = await boot(1440, 900, false, memory), c = h.context;
  c.saveDataHandler.setGameData({ cupId: 3, gameId: 4 });
  c.saveDataHandler.saveData();
  choose(h, "finals", "medium");
  const finals = plain(c.TableTennisModes.finals);
  choose(h, "handicap", "medium");
  await play(h);
  score(h, "user");
  const saved = plain(c.TableTennisModes.handicap);
  choose(h, "handicap", "easy");
  assert.equal(c.TableTennisModes.handicap.stage, 0);
  choose(h, "handicap", "medium", 1);
  assert.equal(c.TableTennisModes.handicap.stage, 0);
  const reload = await boot(390, 844, false, memory), r = reload.context;
  choose(reload, "handicap", "medium");
  assert.deepEqual(plain(r.TableTennisModes.handicap), saved);
  await play(reload);
  r.initPause(); r.butEventHandler("quitFromPause", {});
  choose(reload, "finals", "medium");
  assert.deepEqual(plain(r.TableTennisModes.finals), finals);
  reload.click("play-final");
  await reload.ticks(4);
  assert.equal(r.oGameData.userScore, 0);
  assert.equal(r.oGameData.enemyScore, 0);
  r.initPause(); r.butEventHandler("quitFromPause", {});
  choose(reload, "world", "hard");
  assert.equal(r.oGameData.cupId, 3);
  assert.equal(r.oGameData.gameId, 4);
  r.butEventHandler("playFromMap", {}); r.butEventHandler("playFromGameIntro", {});
  await reload.ticks(4);
  assert.equal(r.oGameData.userScore, 0);
  assert.equal(r.oGameData.enemyScore, 0);
  assert.deepEqual(plain(r.famobi.getFeatureProperties("forced_mode").state), {});
});

test("blocked or write-failing storage keeps handicap progress for the current session", async () => {
  for (const blocked of [false, true]) {
    const h = await boot(390, 844, blocked);
    choose(h);
    if (!blocked) h.memory.set = () => { throw new Error("QuotaExceededError"); };
    await play(h);
    score(h, "user");
    const saved = plain(h.context.TableTennisModes.handicap);
    choose(h);
    assert.deepEqual(plain(h.context.TableTennisModes.handicap), saved);
  }
});

test("immediate next-stage launch leaves exactly one game loop", async () => {
  const h = await boot(1440, 900);
  choose(h);
  await play(h);
  const c = h.context;
  c.oGameData.userScore = 10;
  Object.assign(c.ball, { servingState: 1, offTable: true, tablePosY: 1.5, height: -210, lastHit: "enemy", bounceNum: 0 });
  await h.tick();
  assert.equal(c.gameState, "matchStats");
  h.click("continue-result");
  assert.equal(c.gameState, "handicapProgress");
  h.click("play-handicap");
  await Promise.resolve(); await Promise.resolve();
  assert.equal(c.oGameData.enemyScore, 7);
  let updates = 0;
  const update = c.ball.update;
  c.ball.update = function() { updates++; return update.call(this); };
  await h.ticks(3);
  assert.equal(updates, 3);
});
