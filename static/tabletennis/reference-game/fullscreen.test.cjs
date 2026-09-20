const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { boot } = require("./verify.cjs");
const source = fs.readFileSync(`${__dirname}/fullscreen.js`, "utf8");

function setup({ webkit = false, enabled = true, fail = false } = {}) {
  const listeners = new Map(), calls = [];
  const button = { setAttribute(key, value) { this[key] = value; } };
  const message = { textContent: "" };
  const root = {};
  const elementKey = webkit ? "webkitFullscreenElement" : "fullscreenElement";
  const document = { documentElement: root, [elementKey]: null,
    [webkit ? "webkitFullscreenEnabled" : "fullscreenEnabled"]: enabled,
    querySelectorAll: () => [button], querySelector: () => message,
    addEventListener(name, fn) { listeners.set(name, fn); }
  };
  root[webkit ? "webkitRequestFullscreen" : "requestFullscreen"] = function() {
    assert.equal(this, root, "Fullscreen includes the entire game document");
    calls.push("enter");
    if (fail) return Promise.reject(new Error("NotAllowedError"));
    document[elementKey] = root;
    return webkit ? undefined : Promise.resolve();
  };
  document[webkit ? "webkitExitFullscreen" : "exitFullscreen"] = function() {
    assert.equal(this, document);
    calls.push("exit"); document[elementKey] = null;
    return Promise.resolve();
  };
  const window = { resizeCanvas() { calls.push("resize"); } };
  vm.runInNewContext(source, { document, window });
  return { fullscreen: window.GameFullscreen, button, message, calls, document, root, elementKey,
    changed: () => listeners.get(webkit ? "webkitfullscreenchange" : "fullscreenchange")() };
}

test("enter requests fullscreen synchronously from the gesture and ignores duplicate requests", async () => {
  const h = setup();
  const result = h.fullscreen.enter();
  assert.deepEqual(h.calls, ["enter"], "The browser request must precede any asynchronous work");
  assert.equal(h.button.disabled, true);
  assert.equal(await h.fullscreen.enter(), false);
  assert.equal(await result, true);
  h.changed();
  assert.equal(h.button.textContent, "Exit full screen");
  assert.equal(h.button["aria-pressed"], "true");
  assert.equal(h.button.disabled, false);
  assert.deepEqual(h.calls, ["enter", "resize"]);
});

test("toggle exits and Escape updates the control and resizes without re-entering", async () => {
  const h = setup();
  await h.fullscreen.toggle(); h.changed();
  await h.fullscreen.toggle(); h.changed();
  assert.equal(h.button.textContent, "Full screen");
  assert.deepEqual(h.calls, ["enter", "resize", "exit", "resize"]);
  await h.fullscreen.enter();
  h.document[h.elementKey] = null; // Escape is controlled by the browser.
  h.changed();
  assert.equal(h.button["aria-pressed"], "false");
  assert.equal(h.calls.filter(call => call === "enter").length, 2);
});

test("WebKit fullscreen works with its prefixed events and non-Promise request", async () => {
  const h = setup({ webkit: true });
  assert.equal(await h.fullscreen.enter(), true); h.changed();
  assert.equal(h.button.textContent, "Exit full screen");
  assert.equal(await h.fullscreen.toggle(), true); h.changed();
  assert.equal(h.button.textContent, "Full screen");
});

test("blocked requests do not interrupt Play; the explicit toggle explains failures and permits retry", async () => {
  const h = setup({ fail: true });
  assert.equal(await h.fullscreen.enter(), false);
  assert.equal(h.message.textContent, "");
  assert.equal(await h.fullscreen.toggle(), false);
  assert.match(h.message.textContent, /Full screen was blocked/);
  assert.equal(h.button.disabled, false);
  assert.equal(h.button.textContent, "Full screen");
});

test("unsupported fullscreen remains optional", async () => {
  const h = setup({ enabled: false });
  assert.equal(h.fullscreen.supported, false);
  assert.equal(await h.fullscreen.enter(), false);
  assert.deepEqual(h.calls, []);
  const game = await boot(390, 844);
  assert.doesNotMatch(game.flow.innerHTML, /data-action="fullscreen"/);
  game.click("play");
  assert.equal(game.context.gameState, "chooseCountry");
});

test("the real title Play and fullscreen buttons call the controller before game navigation", async () => {
  const h = await boot(1440, 900);
  const calls = [];
  Object.assign(h.context.GameFullscreen, { supported: true,
    enter() { calls.push(["enter", h.context.gameState]); },
    toggle() { calls.push(["toggle", h.context.gameState]); }
  });
  h.context.initStartScreen();
  assert.match(h.flow.innerHTML, /data-action="fullscreen"/);
  h.click("fullscreen");
  assert.equal(h.context.gameState, "title");
  h.click("play");
  assert.deepEqual(calls, [["toggle", "title"], ["enter", "title"]]);
  assert.equal(h.context.gameState, "chooseCountry");
});
