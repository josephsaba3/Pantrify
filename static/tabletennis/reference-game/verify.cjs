// Node smoke check with a simulated DOM/canvas. This is not a browser playtest.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const root = __dirname;
const read = name => fs.readFileSync(path.join(root, name));
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const manifest = JSON.parse(read("source-manifest.json"));
assert.equal(hash(read("game.js")), manifest.bundleSha256, "Starting game must match the supplied bundle");
assert.deepEqual(manifest.missing, []);
for (const asset of manifest.assets) assert.equal(hash(read(asset.path)), asset.sha256, asset.path);

function dimensions(bytes) {
  if (bytes.toString("ascii", 1, 4) === "PNG") return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  assert.equal(bytes.readUInt16BE(0), 0xffd8, "Image must be PNG or JPEG");
  let offset = 2;
  while (offset < bytes.length) {
    assert.equal(bytes[offset++], 0xff);
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    const length = bytes.readUInt16BE(offset);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) return [bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3)];
    offset += length;
  }
  throw new Error("Missing JPEG dimensions");
}

async function boot(width, height, blockedStorage = false, memory = new Map()) {
  let now = 1000, nextId = 0, drawCalls = 0;
  const timers = new Map(), frames = new Map(), imagePaths = new Set();
  const schedule = (fn, delay = 0) => { const id = ++nextId; timers.set(id, { fn, due: now + delay }); return id; };
  let document;
  const canvasContext = new Proxy({
    measureText: text => ({ width: String(text).length * 8 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    drawImage(img, ...args) {
      assert.ok(img && img.width > 0 && img.height > 0, "Draw must use a loaded image");
      assert.ok(args.every(Number.isFinite), "Draw coordinates must be finite");
      if (args.length === 8) {
        assert.ok(args[0] >= 0 && args[1] >= 0 && args[0] + args[2] <= img.width && args[1] + args[3] <= img.height,
          `Sprite atlas exceeds ${img.src}: ${args.slice(0, 4)}`);
      }
      drawCalls++;
    }
  }, { get: (target, name) => name in target ? target[name] : () => {} });
  function element(tag) {
    const listeners = new Map();
    return {
      nodeType: 1, nodeName: tag.toUpperCase(), tagName: tag.toUpperCase(),
      style: {}, children: [], ownerDocument: document, offsetLeft: 0, offsetTop: 0,
      width, height, hidden: false, parentNode: null,
      listeners,
      addEventListener(name, fn) { listeners.set(name, fn); },
      removeEventListener(name) { listeners.delete(name); },
      appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
      removeChild(child) { this.children = this.children.filter(x => x !== child); },
      setAttribute(name, value) { this[name] = value; },
      getAttribute(name) { return this[name] ?? null; },
      removeAttribute(name) { delete this[name]; },
      getContext: () => canvasContext,
      getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
      getElementsByTagName: () => [],
      querySelector: () => null,
      contains: child => child.parentNode === flow,
      focus() {}
    };
  }
  const canvas = element("canvas"), wrapper = element("div"), loading = element("div"), flow = element("main");
  flow.hidden = true;
  wrapper.appendChild(canvas);
  document = {
    hidden: false, visibilityState: "visible", readyState: "complete",
    createElement: element, createElementNS: (_, tag) => element(tag),
    getElementById: id => ({ canvas, "canvas-wrapper": wrapper, "local-loading": loading, "mode-flow": flow }[id] ?? null),
    getElementsByTagName: () => [], querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}
  };
  document.body = element("body");
  document.documentElement = element("html");
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
  class LocalImage {
    set src(value) {
      assert.match(value, /^images\/[\w.-]+$/);
      this._src = value;
      [this.width, this.height] = dimensions(read(value));
      imagePaths.add(value);
      schedule(() => this.onload?.());
    }
    get src() { return this._src; }
  }
  class SilentAudio {
    canPlayType() { return ""; }
    addEventListener() {}
    removeEventListener() {}
    load() {}
    play() { return Promise.resolve(); }
    pause() {}
  }
  const sandbox = {
    Math: Object.create(Math),
    console, document, navigator: { userAgent: "Chrome Desktop", appVersion: "Chrome", platform: "Win32" },
    location: { protocol: "file:", href: "file:///reference-game/index.html" },
    innerWidth: width, innerHeight: height, Image: LocalImage, Audio: SilentAudio,
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return Math.floor(now); } },
    performance: { now: () => now },
    setTimeout: schedule, clearTimeout: id => timers.delete(id),
    requestAnimationFrame(fn) { const id = ++nextId; frames.set(id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    addEventListener() {}, removeEventListener() {}, scrollTo() {},
    getComputedStyle: node => ({ ...node.style, getPropertyValue: () => "" }),
    open() { throw new Error("Unexpected external navigation"); }
  };
  if (blockedStorage) {
    for (const name of ["localStorage", "sessionStorage"]) Object.defineProperty(sandbox, name, { get() { throw new Error("Storage blocked"); } });
  } else sandbox.localStorage = sandbox.sessionStorage = storage;
  sandbox.window = sandbox.self = sandbox;
  const context = vm.createContext(sandbox);
  const scripts = [...read("index.html").toString().matchAll(/<script src="([^"]+)"/g)].map(match => match[1]);
  for (const name of scripts) vm.runInContext(read(name).toString(), context, { filename: name });
  async function tick(step = 1000 / 60) {
    now += step;
    const queuedFrames = [...frames.values()];
    frames.clear();
    for (const [id, timer] of [...timers]) if (timer.due <= now) { timers.delete(id); timer.fn(); }
    for (const frame of queuedFrames) frame(now);
    await Promise.resolve();
  }
  for (let i = 0; i < 90; i++) await tick();
  assert.equal(context.gameState, "title", "Play/Stats title must finish loading");
  assert.equal(loading.hidden, true);
  assert.ok(imagePaths.has("images/gameElements.png") && drawCalls > 0);
  async function ticks(count = 45) { for (let i = 0; i < count; i++) await tick(); }
  function click(action, details = {}) {
    const button = { dataset: { action, ...details }, parentNode: flow, closest: () => button };
    flow.listeners.get("click")({ target: button });
  }
  return { context, tick, ticks, click, memory, flow, wrapper,
    stats: () => ({ size: [width, height], blockedStorage, images: imagePaths.size, drawCalls, points: context.oGameData.userScore + context.oGameData.enemyScore }) };
}
async function smoke(width, height, blockedStorage = false) {
  const { context, tick, ticks, click, flow, wrapper, stats } = await boot(width, height, blockedStorage);
  for (const [button, data] of [["playFromStart", {}], ["countryChoice", { id: 0 }]]) {
    context.butEventHandler(button, data);
    await ticks();
  }
  assert.equal(context.gameState, "modeSelect");
  assert.equal(wrapper.hidden, true);
  assert.match(flow.innerHTML, /Choose game mode/);
  assert.doesNotMatch(flow.innerHTML, /undefined|NaN/);
  click("world");
  assert.equal(context.gameState, "difficultySelect");
  click("difficulty", { level: "medium" });
  for (const button of ["playFromMap", "playFromGameIntro"]) {
    context.butEventHandler(button, {});
    await ticks();
  }
  assert.equal(context.gameState, "game", "Original menu flow must reach a match");
  context.butEventHandler("tickFromTut", {});
  context.ball.resetServe("enemy");
  for (let i = 0; i < 900 && context.oGameData.userScore + context.oGameData.enemyScore < 2; i++) {
    // Deliberately miss so a real ball must advance, score, and reset service.
    context.userBat.targX = 0;
    context.userBat.targY = height;
    await tick();
  }
  assert.ok(context.oGameData.userScore + context.oGameData.enemyScore >= 1, "An original rally must score");
  for (const key of ["x", "y", "tablePosX", "tablePosY", "height"]) assert.ok(Number.isFinite(context.ball[key]), key);
  context.initPause();
  assert.equal(context.gameState, "pause");
  context.butEventHandler("playFromPause", {});
  for (let i = 0; i < 5; i++) await tick();
  assert.equal(context.gameState, "game");
  return stats();
}
module.exports = { boot, smoke };
if (require.main === module) (async () => {
  for (const options of [[1440, 900], [390, 844], [844, 390], [1440, 900, true]]) console.log(await smoke(...options));
  console.log("Original bundle hash, 18 assets, country-to-mode-to-world flow, rally scoring, pause/resume, and blocked-storage fallback passed (simulated DOM; no browser/audio verification).");
})().catch(error => { console.error(error); process.exitCode = 1; });
