const { test } = require("node:test");
const assert = require("node:assert/strict");
const { boot } = require("./verify.cjs");
const plain = value => JSON.parse(JSON.stringify(value));
const banner = h => h.wrapper.children.find(child => child.id === "match-point-label");

async function launch(h, mode = "world", level = "medium") {
  const c = h.context;
  c.initStartScreen();
  h.click("play");
  if (c.gameState === "chooseCountry") c.butEventHandler("countryChoice", { id: 0 });
  h.click(mode);
  h.click("difficulty", { level });
  if (mode === "world") {
    c.butEventHandler("playFromMap", {});
    c.butEventHandler("playFromGameIntro", {});
  } else h.click(mode === "finals" ? "play-final" : "play-handicap");
  await h.ticks(4);
  assert.equal(c.gameState, "game");
  if (c.firstRun) c.butEventHandler("tickFromTut", {});
}
function point(h, winner, { error = false, server = "user", hits = 0 } = {}) {
  const c = h.context;
  const loser = winner === "user" ? "enemy" : "user";
  Object.assign(c.ball, { statsServer: server, statsLastShot: error ? loser : winner,
    lastHit: error ? loser : winner, bounceNum: error ? 0 : 1, ballShortState: 0 });
  c.rallyHits = hits;
  c.updateScore(winner);
}
async function finish(h, winner = "user") {
  for (let n = 0; n < 110 && h.context.gameState === "game"; n++) point(h, winner);
  await h.ticks(4);
  assert.equal(h.context.gameState, "matchStats");
}

test("title Play/Stats navigation, empty stats, saved-country reload and World startup", async () => {
  for (const [width, height] of [[1440, 900], [390, 844], [844, 390]]) {
    const memory = new Map();
    const h = await boot(width, height, false, memory);
    assert.match(h.flow.innerHTML, /data-action="play"/);
    h.click("stats");
    assert.equal(h.context.gameState, "playerStats");
    assert.match(h.flow.innerHTML, /No completed matches yet/);
    assert.doesNotMatch(h.flow.innerHTML, /NaN|undefined/);
    h.click("home");
    await launch(h);
    const reload = await boot(width, height, false, memory);
    reload.click("play");
    assert.equal(reload.context.gameState, "modeSelect");
    reload.click("world");
    reload.click("difficulty", { level: "easy" });
    assert.equal(reload.context.gameState, "map");
    await reload.ticks(4); // Map rendering requires the original background initializer.
  }
});

test("match-point counts cover both sides, deuce, completed games and the 99-point cap", async () => {
  const h = await boot(390, 844);
  const count = h.context.MatchStats.matchPoints;
  for (const [score, expected] of [
    [[9, 5], [0, 0]], [[10, 5], [5, 0]], [[5, 10], [0, 5]],
    [[10, 0], [10, 0]], [[10, 9], [1, 0]], [[10, 10], [0, 0]],
    [[11, 10], [1, 0]], [[12, 12], [0, 0]], [[12, 13], [0, 1]],
    [[11, 9], [0, 0]], [[12, 10], [0, 0]], [[98, 98], [1, 1]], [[99, 98], [0, 0]]
  ]) assert.deepEqual(Object.values(count(...score)), expected, score.join("-"));
});

test("four-second announcement updates, clears at deuce, and resets on pause/quit/restart", async () => {
  const h = await boot(390, 844);
  await launch(h, "finals");
  const c = h.context, label = banner(h);
  c.oGameData.userScore = 9; c.oGameData.enemyScore = 5;
  point(h, "user");
  assert.equal(label.textContent, "You: 5 match points");
  assert.equal(label.hidden, false);
  await h.tick(3999);
  assert.equal(label.hidden, false);
  await h.tick(2);
  assert.equal(label.hidden, true);
  point(h, "enemy");
  assert.equal(label.textContent, "You: 4 match points");
  c.initPause();
  assert.equal(label.hidden, true);
  c.butEventHandler("playFromPause", {});
  assert.equal(label.hidden, false);
  c.oGameData.enemyScore = 9;
  point(h, "enemy");
  assert.equal(label.hidden, true, "Deuce clears a stale match-point label immediately");
  point(h, "enemy");
  assert.equal(label.textContent, "Opponent: 1 match point");
  c.oGameData.userScore = 98; c.oGameData.enemyScore = 98;
  c.MatchStats.announce();
  assert.equal(label.textContent, "Both players: 1 match point");
  c.initPause(); c.butEventHandler("restartFromPause", {});
  await h.ticks(3);
  assert.equal(label.hidden, true);
  c.oGameData.enemyScore = 10;
  c.MatchStats.announce();
  c.initPause(); c.butEventHandler("quitFromPause", {});
  assert.equal(label.hidden, true);
});

test("record match points actually saved on either side, including repeated deuce chances", async () => {
  const h = await boot(390, 844);
  await launch(h, "finals");
  for (let n = 0; n < 10; n++) point(h, "enemy");
  for (let n = 0; n < 10; n++) point(h, "user");
  assert.equal(h.context.MatchStats.current.player.matchPointsSaved, 10);
  point(h, "user"); point(h, "enemy"); // Opponent saves at 11-10.
  point(h, "enemy"); point(h, "user"); // Player saves at 11-12.
  assert.equal(h.context.MatchStats.current.player.matchPointsSaved, 11);
  assert.equal(h.context.MatchStats.current.opponent.matchPointsSaved, 1);
  await finish(h);
  assert.equal(h.context.MatchStats.totals.player.matchPointsSaved, 11);
});

test("either serve hides the label immediately and live-ball pause/resume cannot restore it", async () => {
  for (const server of ["user", "enemy"]) {
    const h = await boot(390, 844);
    await launch(h, "finals");
    const c = h.context, label = banner(h);
    c.oGameData.userScore = 10; c.oGameData.enemyScore = 5;
    c.ball.resetServe(server);
    assert.equal(label.textContent, "You: 5 match points");
    assert.equal(label.hidden, false);
    if (server === "enemy") c.ball.enemyServe();
    else c.ball.setBouncePoint({ x: 0, y: .3, speed: .3, spin: 0 });
    assert.equal(c.ball.servingState, 1);
    assert.equal(label.hidden, true, `${server} serve hides the banner before the next frame`);
    c.MatchStats.announce();
    assert.equal(label.hidden, true);
    c.initPause(); c.butEventHandler("playFromPause", {});
    assert.equal(label.hidden, true, "Resuming an active ball must not show a banner");
    c.ball.servingState = 2;
    c.MatchStats.announce();
    assert.equal(label.hidden, true, "Rallies must stay unobstructed");
    // A genuine scoring path starts the next between-points announcement.
    Object.assign(c.ball, { offTable: true, offSide: false, tablePosY: 1.5,
      height: -210, lastHit: "user", statsLastShot: "user", bounceNum: 0,
      ballShortState: 0, tableVX: 0, tableVY: 0 });
    c.delta = 0;
    c.ball.update();
    assert.equal(c.oGameData.enemyScore, 6);
    assert.equal(c.ball.servingState, 0);
    assert.equal(label.textContent, "You: 4 match points");
    assert.equal(label.hidden, false);
  }
});

test("real ball terminal paths distinguish out shots, short/net shots and missed returns", async () => {
  const h = await boot(1440, 900);
  await launch(h, "finals");
  const c = h.context;
  function terminal(hitter, winner, { short = false, bounced = false } = {}) {
    const ball = c.ball;
    ball.lastHit = hitter;
    ball.setBouncePoint({ x: 0, y: hitter === "user" ? .3 : .7, speed: .3, spin: 0 });
    assert.equal(ball.statsLastShot, hitter, "Actual shot method records the hitter");
    Object.assign(ball, { servingState: 2, canHit: false, offTable: true, offSide: false,
      tablePosY: 1.5, height: -210, bounceNum: bounced ? 1 : 0,
      ballShortState: short ? 2 : 0, tableVX: 0, tableVY: 0 });
    c.delta = 0;
    const before = c.MatchStats.current[winner === "user" ? "player" : "opponent"].pointsWon;
    ball.update();
    assert.equal(c.MatchStats.current[winner === "user" ? "player" : "opponent"].pointsWon, before + 1);
  }
  terminal("user", "enemy");
  terminal("enemy", "user");
  terminal("user", "user", { bounced: true }); // CPU misses a legal bounce.
  terminal("enemy", "enemy", { bounced: true }); // Player misses a legal bounce.
  assert.equal(c.MatchStats.current.player.unforcedErrors, 1);
  assert.equal(c.MatchStats.current.opponent.unforcedErrors, 1);
  // The source's short-shot path awards the CPU when the ball drops below the screen.
  c.ball.lastHit = "user";
  c.ball.setBouncePoint({ x: 0, y: .3, speed: .3, spin: 0 });
  Object.assign(c.ball, { servingState: 2, canHit: false, offTable: false, offSide: false,
    ballShortState: 2, bounceNum: 1, tablePosY: 5, height: 20, tableVX: 0, tableVY: 0 });
  c.ball.update();
  assert.equal(c.MatchStats.current.player.unforcedErrors, 2, "Net error counts after an own-side bounce");
});

test("a match comparison includes its last point, serve/return splits, errors and longest rally", async () => {
  const h = await boot(390, 844);
  await launch(h, "world");
  point(h, "enemy", { error: true });
  point(h, "user", { server: "enemy", error: true, hits: 7 });
  await finish(h);
  const result = h.context.MatchStats.completed;
  assert.deepEqual(plain(result.score), [11, 1]);
  assert.equal(result.player.pointsWon, 11);
  assert.equal(result.opponent.pointsWon, 1);
  assert.equal(result.player.servePointsWon, 10);
  assert.equal(result.player.returnPointsWon, 1);
  assert.equal(result.player.unforcedErrors, 1);
  assert.equal(result.opponent.unforcedErrors, 1);
  assert.equal(result.longestRally, 7);
  assert.match(h.flow.innerHTML, /Match stats/);
  const saved = JSON.stringify(h.context.MatchStats.totals);
  h.context.initGameComplete(); h.context._initGameComplete(); h.context.updateScore("user");
  assert.equal(JSON.stringify(h.context.MatchStats.totals), saved);
});

test("untouched legal serves count as aces for either side, with faults and rallies excluded", async () => {
  const h = await boot(390, 844);
  await launch(h, "finals");
  const c = h.context;
  for (const server of ["user", "enemy"]) {
    c.ball.resetServe(server);
    assert.equal(c.ball.statsLastShot, null);
    if (server === "enemy") c.ball.enemyServe();
    else c.ball.setBouncePoint({ x: 0, y: .3, speed: .3, spin: 0 });
    Object.assign(c.ball, { offTable: true, offSide: false, height: -210, bounceNum: 2, tablePosY: 1.5 });
    c.delta = 0;
    c.ball.update(); // Actual terminal scoring captures the serve before resetting it.
  }
  assert.equal(c.MatchStats.current.player.aces, 1);
  assert.equal(c.MatchStats.current.opponent.aces, 1);
  for (const server of ["user", "enemy"]) {
    const receiver = server === "user" ? "enemy" : "user";
    point(h, server, { server, error: true, hits: 1 }); // Receiver touches it but hits out.
    point(h, server, { server, hits: 2 }); // Server wins after a rally.
    point(h, receiver, { server, error: true }); // Serve fault.
  }
  assert.equal(c.MatchStats.current.player.aces, 1);
  assert.equal(c.MatchStats.current.opponent.aces, 1);
  await finish(h);
  assert.match(h.flow.innerHTML, /Aces<\/th><td>1<\/td><td>1<\/td>/);
  assert.equal(c.MatchStats.completed.player.aces, 1);
  assert.equal(c.MatchStats.totals.opponent.aces, 1);
  const reload = await boot(390, 844, false, h.memory);
  reload.click("stats");
  assert.match(reload.flow.innerHTML, /Aces<\/th><td>1<\/td><td>1<\/td>/);
});

test("older totals keep their history when aces are added and invalid ace counts are rejected", async () => {
  const h = await boot(390, 844);
  await launch(h); await finish(h);
  const legacy = plain(h.context.MatchStats.totals);
  delete legacy.player.aces; delete legacy.opponent.aces;
  h.context.famobi.localStorage.setItem("player-stats:v1", JSON.stringify(legacy));
  const restored = plain(h.context.MatchStats.totals);
  assert.deepEqual(restored, { ...legacy, player: { ...legacy.player, aces: 0 }, opponent: { ...legacy.opponent, aces: 0 } });
  await launch(h, "handicap"); await finish(h);
  assert.equal(h.context.MatchStats.totals.matches, 2);
  assert.equal(h.context.MatchStats.totals.player.pointsWon, 22);
  for (const aces of [-1, null, "1", 0.5, 12]) {
    const invalid = { ...restored, player: { ...restored.player, aces } };
    assert.equal(h.context.MatchStats.restore(JSON.stringify(invalid)).matches, 0);
  }
});

test("all-time totals combine modes, countries and difficulties, and survive reload", async () => {
  const memory = new Map(), h = await boot(1440, 900, false, memory);
  await launch(h, "world", "easy"); await finish(h);
  h.context.butEventHandler("countryChoice", { id: 1 });
  await launch(h, "finals", "hard"); await finish(h, "enemy");
  await launch(h, "handicap", "challenging"); await finish(h);
  const total = plain(h.context.MatchStats.totals);
  assert.equal(total.matches, 3);
  assert.equal(total.wins, 2); assert.equal(total.losses, 1);
  assert.equal(total.player.pointsWon, 22);
  assert.equal(total.opponent.pointsWon, 11, "Six free handicap points are excluded");
  const reload = await boot(390, 844, false, memory);
  assert.deepEqual(plain(reload.context.MatchStats.totals), total);
  reload.click("stats");
  assert.match(reload.flow.innerHTML, /67%/);
  assert.doesNotMatch(reload.flow.innerHTML, /No completed matches/);
});

test("average rally uses actual points, weights matches by point count and preserves older stats", async () => {
  const h = await boot(390, 844);
  await launch(h, "finals");
  for (let n = 0; n < 11; n++) point(h, "user", { hits: 2 });
  assert.match(h.flow.innerHTML, /Average rally: <strong>2\.0 returns/);
  assert.equal(h.context.MatchStats.completed.ralliesTracked, 11);
  await launch(h, "handicap");
  point(h, "enemy", { hits: 10 });
  for (let n = 0; n < 11; n++) point(h, "user", { hits: 4 });
  assert.match(h.flow.innerHTML, /Average rally: <strong>4\.5 returns/);
  assert.equal(h.context.MatchStats.completed.ralliesTracked, 12, "Free handicap points do not dilute the average");
  h.context.initStartScreen(); h.click("stats");
  const total = plain(h.context.MatchStats.totals);
  assert.equal(total.totalRallyHits, 76);
  assert.equal(total.ralliesTracked, 23);
  assert.match(h.flow.innerHTML, /Average rally: <strong>3\.3 returns/);
  const reload = await boot(390, 844, false, h.memory);
  assert.deepEqual(plain(reload.context.MatchStats.totals), total);
  // Saves from the first stats version retain wins/points without inventing rally history.
  delete total.totalRallyHits; delete total.ralliesTracked;
  reload.context.famobi.localStorage.setItem("player-stats:v1", JSON.stringify(total));
  reload.click("stats");
  assert.equal(reload.context.MatchStats.totals.matches, 2);
  assert.equal(reload.context.MatchStats.totals.ralliesTracked, 0);
  assert.match(reload.flow.innerHTML, /since rally tracking was added/);
  await launch(reload, "world");
  for (let n = 0; n < 11; n++) point(reload, "user", { hits: 6 });
  await reload.ticks(4);
  reload.context.initStartScreen(); reload.click("stats");
  assert.equal(reload.context.MatchStats.totals.matches, 3);
  assert.match(reload.flow.innerHTML, /Average rally: <strong>6\.0 returns/);
});

test("Handicap 0-10 starts on ten match points and a 12-10 comeback saves ten", async () => {
  const h = await boot(390, 844);
  await launch(h, "handicap");
  for (let stage = 0; stage < 4; stage++) {
    await finish(h);
    h.click("continue-result"); h.click("play-handicap"); await h.ticks(4);
  }
  assert.equal(banner(h).textContent, "Opponent: 10 match points");
  await finish(h);
  const result = h.context.MatchStats.completed;
  assert.deepEqual(plain(result.score), [12, 10]);
  assert.equal(result.player.pointsWon, 12);
  assert.equal(result.opponent.pointsWon, 0);
  assert.equal(result.player.matchPointsSaved, 10);
  assert.match(h.flow.innerHTML, /CPU started with 10 points/);
  assert.equal(banner(h).hidden, true);
});

test("pause keeps current stats; restart, quit and reload discard unfinished matches", async () => {
  const h = await boot(390, 844);
  await launch(h, "finals");
  point(h, "user");
  h.context.initPause(); h.context.butEventHandler("playFromPause", {});
  assert.equal(h.context.MatchStats.current.player.pointsWon, 1);
  h.context.initPause(); h.context.butEventHandler("restartFromPause", {});
  await h.ticks(4);
  assert.equal(h.context.MatchStats.current.player.pointsWon, 0);
  point(h, "enemy");
  h.context.initPause(); h.context.butEventHandler("quitFromPause", {});
  assert.equal(h.context.MatchStats.current, null);
  assert.equal(h.context.MatchStats.totals.matches, 0);
  await launch(h, "world"); point(h, "user");
  const reload = await boot(390, 844, false, h.memory);
  assert.equal(reload.context.MatchStats.totals.matches, 0);
});

test("blocked and write-failing storage preserve session totals without throwing", async () => {
  for (const blocked of [true, false]) {
    const h = await boot(390, 844, blocked);
    await launch(h, "world"); await finish(h);
    if (!blocked) h.memory.set = () => { throw new Error("QuotaExceededError"); };
    await launch(h, "finals"); await finish(h);
    h.context.initStartScreen(); h.click("stats");
    assert.equal(h.context.MatchStats.totals.matches, 2);
  }
});

test("malformed or incompatible stat records produce a usable empty state", async () => {
  const h = await boot(390, 844);
  for (const raw of ["{", "null", "[]", '{"version":2}', JSON.stringify({ ...plain(h.context.MatchStats.totals), matches: -1 })]) {
    h.context.famobi.localStorage.setItem("player-stats:v1", raw);
    h.click("stats");
    assert.equal(h.context.MatchStats.totals.matches, 0);
    assert.doesNotMatch(h.flow.innerHTML, /NaN|undefined/);
  }
});

test("World wins save before leaving stats; losses retry and cup wins still open the map", async () => {
  for (const [cup, game, won, expectedCup, expectedGame, nextScreen] of [
    [0, 0, true, 0, 1, "gameIntro"], [0, 0, false, 0, 0, "game"],
    [0, 5, true, 1, 0, "map"], [9, 5, true, 10, 6, "map"]
  ]) {
    const h = await boot(1440, 900);
    h.context.saveDataHandler.setGameData({ cupId: cup, gameId: game });
    h.context.saveDataHandler.saveData();
    await launch(h, "world"); await finish(h, won ? "user" : "enemy");
    assert.equal(h.context.saveDataHandler.getCurCupId(), expectedCup);
    assert.equal(h.context.saveDataHandler.getCurGameId(), expectedGame);
    h.click("continue-result"); await h.ticks(4);
    assert.equal(h.context.gameState, nextScreen);
    assert.equal(h.context.MatchStats.totals.matches, 1);
  }
});
