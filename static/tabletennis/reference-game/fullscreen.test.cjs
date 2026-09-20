const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { boot } = require("./verify.cjs");
const source = fs.readFileSync(`${__dirname}/fullscreen.js`, "utf8");
const settle = () => new Promise(resolve => setImmediate(resolve));

function setup({ webkit = false, enabled = true, fail = false, activated = false } = {}) {
  const listeners = new Map(), calls = [];
  let shouldFail = fail;
  const button = { setAttribute(key, value) { this[key] = value; } };
  const message = { textContent: "" };
  const root = {};
  const elementKey = webkit ? "webkitFullscreenElement" : "fullscreenElement";
  const document = { documentElement: root, [elementKey]: null,
    [webkit ? "webkitFullscreenEnabled" : "fullscreenEnabled"]: enabled,
    querySelectorAll: () => [button], querySelector: () => message,
    addEventListener(name, fn, options) { listeners.set(name, { fn, options }); }
  };
  root[webkit ? "webkitRequestFullscreen" : "requestFullscreen"] = function() {
    assert.equal(this, root, "Fullscreen includes the entire game document");
    calls.push("enter");
    if (shouldFail) return Promise.reject(new Error("NotAllowedError"));
    document[elementKey] = root;
    return webkit ? undefined : Promise.resolve();
  };
  document[webkit ? "webkitExitFullscreen" : "exitFullscreen"] = function() {
    assert.equal(this, document);
    calls.push("exit"); document[elementKey] = null;
    return Promise.resolve();
  };
  const window = { navigator: { userActivation: { isActive: activated } }, resizeCanvas() { calls.push("resize"); } };
  vm.runInNewContext(source, { document, window });
  return { fullscreen: window.GameFullscreen, button, message, calls, document, root, elementKey,
    changed: () => listeners.get(webkit ? "webkitfullscreenchange" : "fullscreenchange").fn(),
    allow: () => { shouldFail = false; },
    gesture(type, details = {}) {
      const listener = listeners.get(type);
      assert.equal(listener.options.capture, true, "Handle input before the canvas can stop propagation");
      listener.fn({ type, isTrusted: true, button: 0, target: { closest: () => null }, ...details });
    }
  };
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
  await h.fullscreen.toggle();
  h.document[h.elementKey] = null; // Escape is controlled by the browser.
  h.changed();
  h.gesture("pointerdown", { pointerType: "mouse" });
  assert.equal(await h.fullscreen.enter(), false, "Play must also respect a previous Escape exit");
  assert.equal(h.button["aria-pressed"], "false");
  assert.equal(h.calls.filter(call => call === "enter").length, 2);
});

test("first mouse press, tap, pen release, click or keyboard activation automatically requests fullscreen", async () => {
  for (const [type, details] of [["pointerdown", { pointerType: "mouse" }], ["pointerup", { pointerType: "touch" }],
    ["pointerup", { pointerType: "pen" }], ["touchend", {}], ["click", {}], ["keydown", { key: "Enter" }], ["keydown", { key: " " }]]) {
    const h = setup();
    assert.deepEqual(h.calls, [], "Page load alone must not consume a request");
    h.gesture(type, details);
    assert.deepEqual(h.calls, ["enter"], `${type} requests synchronously`);
    await settle();
  }
});

test("rejected automatic entry retries on the next gesture and stops retrying after success", async () => {
  const h = setup({ fail: true });
  h.gesture("pointerdown", { pointerType: "mouse" });
  await settle();
  h.allow();
  h.gesture("click");
  await settle();
  h.changed();
  h.document[h.elementKey] = null;
  h.changed();
  h.gesture("click");
  assert.equal(h.calls.filter(call => call === "enter").length, 2);
});

test("automatic entry ignores synthetic input, early touch presses, shortcuts and the explicit toggle", async () => {
  const h = setup();
  h.gesture("click", { isTrusted: false });
  h.gesture("pointerdown", { pointerType: "touch" });
  h.gesture("pointerup", { pointerType: "mouse" });
  h.gesture("pointerdown", { pointerType: "mouse", button: 2 });
  h.gesture("keydown", { key: "Escape" });
  h.gesture("keydown", { key: "Enter", repeat: true });
  h.gesture("keydown", { key: "Enter", ctrlKey: true });
  h.gesture("click", { target: { closest: () => ({}) } });
  assert.deepEqual(h.calls, []);
  await h.fullscreen.toggle();
  assert.deepEqual(h.calls, ["enter"], "The explicit toggle still works");
});

test("an activation already present during startup can enter immediately", async () => {
  const h = setup({ activated: true });
  assert.deepEqual(h.calls, ["enter"]);
  await settle();
  assert.equal(h.button.textContent, "Exit full screen");
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
