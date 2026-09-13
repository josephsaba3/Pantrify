// Tournament logic and integration with the supplied game. No browser rendering.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { boot } = require("./verify.cjs");
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "finals-tournament.js"), "utf8"), sandbox);
const T = sandbox.window.FinalsTournament;
const countries = Array.from({ length: 40 }, (_, id) => id);
const plain = value => JSON.parse(JSON.stringify(value));
function rng(seed) { return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296); }
function result(state, won = true, random = rng(12)) {
  return T.record(state, T.nextMatch(state).token, won ? 11 : 8, won ? 8 : 11, random);
}

test("32 unique countries, 31 matches, and five real wins produce the player's championship", () => {
  for (let player = 0; player < 40; player++) {
    let state = T.create(player, countries, rng(player + 1));
    assert.equal(new Set(state.entrants).size, 32);
    assert.ok(state.entrants.includes(player));
    assert.deepEqual(plain(state.rounds.map(round => round.length)), [16, 8, 4, 2, 1]);
    for (let round = 0; round < 5; round++) {
      const previous = plain(state);
      const next = T.nextMatch(state);
      assert.equal(next.round, round);
      assert.notEqual(next.opponentId, player);
      const updated = result(state);
      assert.deepEqual(plain(state), previous, "Recording does not mutate the saved draw");
      assert.equal(updated.rounds[round][next.index].winner, player);
      assert.ok(updated.rounds[round].every(match => match.winner !== null));
      state = T.restore(JSON.stringify(updated), countries);
      assert.ok(state, "Every round survives a reload");
    }
    assert.equal(state.status, "champion");
    assert.equal(state.champion, player);
    assert.equal(T.nextMatch(state), null);
  }
});

test("a loss in any round eliminates the player and completes a coherent 31-match draw", () => {
  for (let lostRound = 0; lostRound < 5; lostRound++) {
    let state = T.create(0, countries, rng(50 + lostRound));
    for (let round = 0; round < lostRound; round++) state = result(state);
    state = result(state, false);
    assert.equal(state.status, "eliminated");
    assert.equal(state.eliminatedRound, lostRound);
    assert.notEqual(state.champion, 0);
    assert.equal(T.nextMatch(state), null);
    assert.equal(state.rounds.flat().filter(match => match.winner !== null).length, 31);
    assert.ok(T.restore(state, countries));
  }
});

test("finished matches support deuce and the source's 99-point cap; stale callbacks cannot advance twice", () => {
  const state = T.create(0, countries, rng(8));
  const token = T.nextMatch(state).token;
  for (const score of [[11, 9], [12, 10], [24, 22], [99, 98], [98, 99]]) {
    assert.ok(T.restore(T.record(state, token, ...score), countries));
  }
  for (const score of [[10, 8], [11, 10], [10, 10], [-1, 11], [11.5, 8], [100, 98], [NaN, 0]]) {
    assert.throws(() => T.record(state, token, ...score));
  }
  const advanced = result(state);
  assert.throws(() => T.record(advanced, token, 11, 0));
  assert.throws(() => T.record(state, "old-draw:0:0", 11, 0));
});

test("invalid or incompatible saves are discarded", () => {
  const original = T.create(0, countries, rng(2));
  const corruptions = [
    state => { state.entrants[0] = state.entrants[1]; },
    state => { state.entrants[0] = 900; },
    state => { state.rounds[1][0].home = 0; },
    state => { state.round = 3; },
    state => { state.champion = 0; },
    state => { state.rounds[0][0].winner = state.rounds[0][0].home; },
    state => { state.playerId = 900; },
    state => { state.status = "champion"; },
    state => { state.rounds.pop(); }
  ];
  for (const mutate of corruptions) {
    const state = plain(original); mutate(state);
    assert.equal(T.restore(JSON.stringify(state), countries), null);
  }
  for (const data of [null, "{", "null", "[]", undefined]) assert.equal(T.restore(data, countries), null);
  assert.throws(() => T.create(0, countries.slice(0, 31)));
});

async function selectCountry(h, countryIndex = 0) {
  h.context.butEventHandler("playFromStart", {});
  assert.equal(h.context.gameState, "chooseCountry");
  h.context.butEventHandler("countryChoice", { id: countryIndex });
  assert.equal(h.context.gameState, "modeSelect");
  assert.match(h.flow.innerHTML, /Choose game mode/);
  assert.doesNotMatch(h.flow.innerHTML, /undefined|NaN/);
}
async function startMatch(h) {
  const expected = h.context.FinalsTournament.nextMatch(h.context.TableTennisModes.finals);
  h.click("play-final");
  h.click("play-final"); // Rapid second input must not create another game.
  await h.ticks(4);
  assert.equal(h.context.gameState, "game");
  assert.equal(h.flow.hidden, true);
  assert.equal(h.wrapper.hidden, false);
  assert.equal(h.context.oGameData.enemyId, expected.opponentId);
  assert.equal(h.context.oGameData.cupId, 0);
  assert.equal(h.context.oGameData.gameId, 0);
  if (h.context.firstRun) h.context.butEventHandler("tickFromTut", {});
  return expected;
}
async function scoreMatch(h, won = true) {
  h.context.oGameData.userScore = won ? 10 : 8;
  h.context.oGameData.enemyScore = won ? 8 : 10;
  h.context.updateScore(won ? "user" : "enemy", "test");
  assert.equal(h.context.gameState, "matchStats");
  assert.match(h.flow.innerHTML, /Match points saved/);
  const state = JSON.stringify(h.context.TableTennisModes.finals);
  h.context.initGameComplete();
  assert.equal(JSON.stringify(h.context.TableTennisModes.finals), state, "Duplicate result callback is harmless");
  h.click("continue-result");
  await h.ticks(4);
  assert.equal(h.context.gameState, "finalsBracket");
  assert.equal(h.flow.hidden, false);
  assert.equal(h.wrapper.hidden, true);
  assert.doesNotMatch(h.flow.innerHTML, /undefined|NaN/);
}

for (const [width, height] of [[1440, 900], [390, 844], [844, 390]]) {
  test(`country -> mode -> five wins -> champion -> new finals (${width}x${height}, simulated DOM)`, async () => {
    const h = await boot(width, height);
    await selectCountry(h, h.context.countryFlags.aIds.indexOf(0)); // Spain has ID 0.
    h.click("finals");
  h.click("difficulty", { level: "medium" });
    assert.equal(h.context.gameState, "finalsBracket");
    assert.equal(h.context.TableTennisModes.finals.entrants.length, 32);
    assert.equal((h.flow.innerHTML.match(/class="match-cell"/g) || []).length, 31);
    for (let round = 0; round < 5; round++) {
      assert.equal(h.context.TableTennisModes.finals.round, round);
      await startMatch(h);
      await scoreMatch(h);
    }
    assert.equal(h.context.TableTennisModes.finals.status, "champion");
    assert.match(h.flow.innerHTML, /Spain wins the finals!/);
    const finishedId = h.context.TableTennisModes.finals.id;
    h.click("new-finals");
    assert.equal(h.context.TableTennisModes.finals.status, "active");
    assert.equal(h.context.TableTennisModes.finals.round, 0);
    assert.notEqual(h.context.TableTennisModes.finals.id, finishedId);
  });
}

test("saved finals resume; countries and World progression remain separate", async () => {
  const memory = new Map();
  const h = await boot(1440, 900, false, memory);
  h.context.saveDataHandler.setGameData({ cupId: 2, gameId: 3 });
  h.context.saveDataHandler.saveData();
  await selectCountry(h);
  h.click("finals");
  h.click("difficulty", { level: "medium" });
  await startMatch(h);
  await scoreMatch(h);
  const saved = plain(h.context.TableTennisModes.finals);
  const reloaded = await boot(1440, 900, false, memory);
  await selectCountry(reloaded);
  assert.match(reloaded.flow.innerHTML, /Choose difficulty/);
  reloaded.click("finals");
  reloaded.click("difficulty", { level: "medium" });
  assert.deepEqual(plain(reloaded.context.TableTennisModes.finals), saved);
  reloaded.click("modes");
  reloaded.click("world");
  reloaded.click("difficulty", { level: "medium" });
  assert.equal(reloaded.context.gameState, "map");
  assert.equal(reloaded.context.oGameData.cupId, 2);
  assert.equal(reloaded.context.oGameData.gameId, 3);
  await selectCountry(reloaded, 1);
  reloaded.click("finals");
  reloaded.click("difficulty", { level: "medium" });
  assert.notEqual(reloaded.context.TableTennisModes.finals.playerId, saved.playerId);
  assert.equal(reloaded.context.TableTennisModes.finals.round, 0);
  await selectCountry(reloaded, 0);
  reloaded.click("finals");
  reloaded.click("difficulty", { level: "medium" });
  assert.deepEqual(plain(reloaded.context.TableTennisModes.finals), saved);
  await startMatch(reloaded);
  await scoreMatch(reloaded, false);
  assert.equal(reloaded.context.TableTennisModes.finals.status, "eliminated");
  assert.match(reloaded.flow.innerHTML, /Eliminated in the round of 16/);
  assert.equal(reloaded.context.saveDataHandler.getCurCupId(), 2);
  assert.equal(reloaded.context.saveDataHandler.getCurGameId(), 3);
});

test("pause resume, restart, and quit keep the same pending opponent and round", async () => {
  const h = await boot(1440, 900);
  await selectCountry(h);
  h.click("finals");
  h.click("difficulty", { level: "medium" });
  const original = plain(h.context.TableTennisModes.finals);
  const expected = await startMatch(h);
  h.context.initPause();
  h.context.butEventHandler("playFromPause", {});
  await h.ticks(4);
  assert.equal(h.context.gameState, "game");
  h.context.initPause();
  h.context.butEventHandler("restartFromPause", {});
  await h.ticks(4);
  assert.equal(h.context.gameState, "game");
  assert.equal(h.context.oGameData.enemyId, expected.opponentId);
  h.context.initPause();
  h.context.butEventHandler("quitFromPause", {});
  await h.ticks(4);
  assert.equal(h.context.gameState, "finalsBracket");
  assert.deepEqual(plain(h.context.TableTennisModes.finals), original);
  await startMatch(h);
  await scoreMatch(h);
  assert.equal(h.context.TableTennisModes.finals.round, 1);
});

test("blocked browser storage supports a playable finals session", async () => {
  const h = await boot(390, 844, true);
  await selectCountry(h);
  h.click("finals");
  h.click("difficulty", { level: "medium" });
  await startMatch(h);
  await scoreMatch(h);
  const saved = plain(h.context.TableTennisModes.finals);
  h.click("modes");
  h.click("finals");
  h.click("difficulty", { level: "medium" });
  assert.deepEqual(plain(h.context.TableTennisModes.finals), saved);
});

test("immediately starting the next round runs one match loop", async () => {
  const h = await boot(1440, 900);
  await selectCountry(h);
  h.click("finals");
  h.click("difficulty", { level: "medium" });
  await startMatch(h);
  h.context.oGameData.userScore = 10;
  h.context.oGameData.enemyScore = 0;
  // Exercise the original ball's scoring path, including its service-reset callback.
  Object.assign(h.context.ball, { servingState: 1, offTable: true, tablePosY: 1.5, height: -210, lastHit: "enemy", bounceNum: 0 });
  await h.tick();
  assert.equal(h.context.gameState, "matchStats");
  h.click("continue-result");
  assert.equal(h.context.gameState, "finalsBracket");
  h.click("play-final");
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(h.context.gameState, "game");
  let updates = 0;
  const update = h.context.ball.update;
  h.context.ball.update = function() { updates++; return update.call(this); };
  await h.ticks(3);
  assert.equal(updates, 3, "Only one ball update per animation frame after a new match");
});

test("readable but write-failing storage never replaces current progress with an older draw", async () => {
  const h = await boot(1440, 900);
  await selectCountry(h);
  h.click("finals");
  h.click("difficulty", { level: "medium" });
  const adapter = h.context.famobi.localStorage;
  adapter.setItem("removal-check", "old");
  h.memory.set = h.memory.delete = () => { throw new Error("QuotaExceededError"); };
  await startMatch(h);
  await scoreMatch(h);
  const saved = plain(h.context.TableTennisModes.finals);
  h.click("modes");
  h.click("finals");
  h.click("difficulty", { level: "medium" });
  assert.deepEqual(plain(h.context.TableTennisModes.finals), saved);
  assert.equal(h.context.TableTennisModes.finals.round, 1);
  adapter.removeItem("removal-check");
  assert.equal(adapter.getItem("removal-check"), null, "Failed persistent removal stays removed for this session");
});
