const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { boot } = require("./verify.cjs");
const plain = value => JSON.parse(JSON.stringify(value));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
const ids = ["balanced", "spinny", "speedy"];
function choosePaddle(h, id) {
  h.flow.listeners.get("change")({ target: { name: "paddle", value: id } });
}
async function start(h, id = "balanced", mode = "finals") {
  h.context.butEventHandler("playFromStart", {});
  h.context.butEventHandler("countryChoice", { id: 0 });
  choosePaddle(h, id);
  h.click(mode);
  h.click("difficulty", { level: "medium" });
  if (mode === "world") {
    h.context.butEventHandler("playFromMap", {});
    h.context.butEventHandler("playFromGameIntro", {});
  } else h.click(mode === "finals" ? "play-final" : "play-handicap");
  await h.ticks(4);
  if (h.context.firstRun) h.context.butEventHandler("tickFromTut", {});
  assert.equal(h.context.gameState, "game");
}
function stroke(c, id, lateral, forward, fps = 60) {
  c.PaddleTypes.select(id);
  const paddle = new c.Elements.UserBat();
  c.delta = 1 / fps;
  Object.assign(paddle, { x: 720, y: 600, prevX: 720 - lateral / fps, prevY: 600 + forward / fps });
  return paddle;
}

test("Balanced is the default; valid choices persist and invalid values cannot replace them", async () => {
  const memory = new Map();
  const h = await boot(1440, 900, false, memory);
  assert.equal(h.context.PaddleTypes.selected, "balanced");
  for (const id of ids) {
    assert.equal(h.context.PaddleTypes.select(id), true);
    for (const invalid of [undefined, null, "unknown", "__proto__", "toString"]) {
      assert.equal(h.context.PaddleTypes.select(invalid), false);
      assert.equal(h.context.PaddleTypes.selected, id);
    }
  }
  const reload = await boot(390, 844, false, memory);
  assert.equal(reload.context.PaddleTypes.selected, "speedy");
  memory.set("table-tennis-reference:paddle:v1", "unknown");
  const invalid = await boot(390, 844, false, memory);
  assert.equal(invalid.context.PaddleTypes.selected, "balanced");
  const blocked = await boot(390, 844, true);
  await start(blocked, "spinny");
  assert.equal(blocked.context.userBat.paddleType, "spinny");
  assert.equal(blocked.context.famobi.localStorage.getItem("paddle:v1"), "spinny");
});

test("menu choices equip all three modes, survive pause/restart, and use the chosen artwork", async () => {
  const sizes = [[1440, 900], [390, 844], [844, 390]];
  for (const [i, mode] of ["world", "finals", "handicap"].entries()) for (const id of ids) {
    const h = await boot(...sizes[i]);
    await start(h, id, mode);
    const c = h.context;
    assert.equal(c.userBat.paddleType, id);
    const data = c.assetLib.getData("gameElements"), atlas = data.oData.oAtlasData;
    const profile = c.PaddleTypes.profiles[id], face = atlas[c.oImageIds[profile.sprite]];
    const playerAtlas = c.userBat.oGameElementsImgData.oData.oAtlasData;
    assert.deepEqual(plain(playerAtlas[c.oImageIds.userBatCentre]), plain(face));
    assert.notEqual(playerAtlas, atlas, "Shared atlas must not be modified");
    assert.equal(atlas[c.oImageIds.userBatCentre].x, 1344);
    const front = playerAtlas[c.oImageIds.userBatEdge];
    assert.ok(front.x >= face.x && front.y >= face.y && front.x + front.width <= face.x + face.width && front.y + front.height <= face.y + face.height);
    assert.equal(c.enemyBat.id, c.PaddleTypes.profiles[c.enemyBat.paddleType].enemyId);
    const opponentType = c.enemyBat.paddleType;
    choosePaddle(h, id === "balanced" ? "speedy" : "balanced");
    assert.equal(c.PaddleTypes.selected, id, "Hidden menu events cannot change active equipment");
    c.initPause();
    c.butEventHandler("playFromPause", {});
    await h.ticks(2);
    assert.equal(c.enemyBat.paddleType, opponentType, "Resume must not reroll the CPU paddle");
    c.initPause();
    c.butEventHandler("restartFromPause", {});
    await h.ticks(3);
    assert.equal(c.userBat.paddleType, id);
    c.TableTennisModes.showModes();
    assert.match(h.flow.innerHTML, new RegExp(`name="paddle" value="${id}" checked`));
    for (const label of ["Balanced", "Spinny", "Speedy", "Green", "Red", "Blue"]) assert.ok(h.flow.innerHTML.includes(label));
  }
});

test("Balanced exactly matches the supplied stroke across swipes, serves and frame rates", async () => {
  const h = await boot(1440, 900);
  await start(h);
  const c = h.context;
  // Evaluate the source function itself as the independent baseline. Its
  // bundle hash is also checked by verify.cjs; do not duplicate its formula.
  const source = fs.readFileSync(path.join(__dirname, "game.js"), "utf8");
  const marker = "t.prototype.getHitData=";
  const startIndex = source.indexOf(marker);
  const original = vm.runInContext(`(${source.slice(startIndex + marker.length, source.indexOf(",t.prototype.render=", startIndex))})`, c);
  for (const fps of [30, 60, 144]) for (const serving of [0, 2]) {
    c.ball.servingState = serving;
    for (const lateral of [-3500, -1700, 0, 1700, 3500]) for (const forward of [0, 1125, 2250, 4500]) {
      const paddle = stroke(c, "balanced", lateral, forward, fps);
      for (const x of [-0.8, 0, 0.8]) {
        assert.deepEqual(plain(paddle.getHitData(x, 0.8)), plain(original.call(paddle, x, 0.8)));
      }
    }
  }
});

test("Spinny needs a gentler sideways swipe, preserves aim/pace, and caps the spin bonus", async () => {
  const h = await boot(1440, 900);
  await start(h);
  const c = h.context;
  c.ball.servingState = 2;
  for (const fps of [30, 60, 144]) for (const sign of [-1, 1]) {
    const normal = stroke(c, "balanced", sign * 1680, 450, fps).getHitData(0, 0.8);
    const spinny = stroke(c, "spinny", sign * 1680, 450, fps).getHitData(0, 0.8);
    assert.equal(normal.spin, 0);
    assert.ok(spinny.spin * sign < 0 && Math.abs(spinny.spin) < 0.1);
    close(spinny.x, normal.x); close(spinny.y, normal.y); close(spinny.speed, normal.speed);
    const maximum = stroke(c, "spinny", sign * 10000, 0, fps).getHitData(0, 0.8);
    close(Math.abs(maximum.spin), 1.05);
  }
  for (const [lateral, forward] of [[0, 0], [0, 1000], [1500, 0], [3500, 2250], [3500, 4500]]) {
    assert.equal(stroke(c, "spinny", lateral, forward).getHitData(0, 0.8).spin, 0);
  }
});

test("Speedy gives a bounded 8% pace bonus without changing spin or placement", async () => {
  const h = await boot(1440, 900);
  await start(h);
  const c = h.context;
  for (const serving of [0, 2]) for (const forward of [0, 1125, 4500, 10000]) {
    c.ball.servingState = serving;
    const normal = stroke(c, "balanced", 2400, forward).getHitData(0.3, 0.8);
    const fastPaddle = stroke(c, "speedy", 2400, forward);
    const speedy = fastPaddle.getHitData(0.3, 0.8);
    close(speedy.speed, normal.speed * 1.08);
    assert.ok(speedy.speed <= 0.648 + 1e-10);
    close(speedy.x, normal.x); close(speedy.y, normal.y); close(speedy.spin, normal.spin);
    assert.deepEqual(plain(fastPaddle.getHitData(0.3, 0.8)), plain(speedy), "Repeated shot lookup must not compound bonuses");
  }
});

test("CPU picks all types equally, keeps them between strokes, and applies bonuses once", async () => {
  const h = await boot(1440, 900);
  await start(h);
  const c = h.context;
  c.ball.servingState = 2;
  const counts = { balanced: 0, spinny: 0, speedy: 0 };
  for (let i = 0; i < 300; i++) {
    c.Math.random = () => (i + 0.5) / 300;
    const opponent = new c.Elements.EnemyBat();
    const id = opponent.paddleType, profile = c.PaddleTypes.profiles[id];
    counts[id]++;
    assert.equal(opponent.id, profile.enemyId);
    const shot = opponent.getHitData(0, 0.2), base = opponent.shotCache.value;
    close(shot.speed, base.speed * profile.speed); close(shot.spin, base.spin * profile.spin);
    for (let repeat = 0; repeat < 3; repeat++) {
      assert.deepEqual(plain(opponent.getHitData(0, 0.2)), plain(shot));
      assert.deepEqual(plain(opponent._getHitData(0, 0.2)), plain(shot));
      assert.equal(opponent.paddleType, id);
    }
    if (base.y > 1 || Math.abs(base.x) > 1.12) assert.equal(shot.spin, 0, "Equipment preserves CPU mishits");
  }
  assert.deepEqual(counts, { balanced: 100, spinny: 100, speedy: 100 });
});

test("each new World Cup opponent chooses independently across all five Finals rounds", async () => {
  const h = await boot(1440, 900);
  const c = h.context;
  c.butEventHandler("playFromStart", {});
  c.butEventHandler("countryChoice", { id: 0 });
  choosePaddle(h, "speedy");
  h.click("finals");
  h.click("difficulty", { level: "medium" });
  const choices = [[0.1, "balanced"], [0.5, "spinny"], [0.9, "speedy"], [0.5, "spinny"], [0.1, "balanced"]];
  const opponents = new Set();
  for (const [roll, expected] of choices) {
    c.Math.random = () => roll;
    h.click("play-final");
    await h.ticks(4);
    if (c.firstRun) c.butEventHandler("tickFromTut", {});
    assert.equal(c.gameState, "game");
    assert.equal(c.enemyBat.paddleType, expected);
    assert.equal(c.userBat.paddleType, "speedy", "Player choice survives every round");
    opponents.add(c.enemyBat);
    c.oGameData.userScore = 10;
    c.oGameData.enemyScore = 0;
    c.updateScore("user");
    assert.equal(c.gameState, "matchStats");
    h.click("continue-result");
  }
  assert.equal(opponents.size, 5);
  assert.equal(c.TableTennisModes.finals.status, "champion");
});

test("paddle bonuses reach actual ball velocity and curvature through the source physics", async () => {
  const h = await boot(1440, 900);
  await start(h);
  const c = h.context;
  const outcomes = {};
  c.famobi.paused = false;
  for (const id of ids) {
    c.ball = new c.Elements.Ball();
    Object.assign(c.ball, { tablePosX: 0, tablePosY: 0.8, height: 60, lastHit: "user", servingState: 2, bounceNum: 0 });
    const shot = stroke(c, id, 1680, 450).getHitData(0, 0.8);
    c.ball.setBouncePoint(shot);
    const velocity = Math.abs(c.ball.tableVY);
    for (let i = 0; i < 8; i++) c.ball.update();
    outcomes[id] = { velocity, curve: c.ball.spinInc };
    assert.ok([c.ball.x, c.ball.y, c.ball.tablePosX, c.ball.tablePosY, c.ball.height].every(Number.isFinite));
  }
  assert.ok(outcomes.speedy.velocity > outcomes.balanced.velocity);
  assert.ok(outcomes.speedy.velocity < outcomes.balanced.velocity * 1.14);
  close(outcomes.spinny.velocity, outcomes.balanced.velocity);
  assert.equal(outcomes.balanced.curve, 0);
  assert.equal(outcomes.speedy.curve, 0);
  assert.ok(outcomes.spinny.curve < 0);
});
