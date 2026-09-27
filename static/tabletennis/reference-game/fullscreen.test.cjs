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
    querySelectorAll: selector => selector === '[data-fullscreen-status]' ? [message] : [button], querySelector: () => message,
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

function pauseElements(h) {
  const controls = h.context.document.body.children.find(node => node.id === "pause-controls");
  assert.ok(controls);
  return { controls, button: controls.children[0], message: controls.children[1] };
}
function connectFullscreen(h, fail = false) {
  const c = h.context, document = c.document, elements = pauseElements(h);
  const listeners = new Map(), calls = [];
  const titleButton = { setAttribute(key, value) { this[key] = value; } }, titleMessage = {};
  document.addEventListener = (name, callback) => listeners.set(name, callback);
  document.querySelectorAll = selector => selector === '[data-fullscreen-status]'
    ? [titleMessage, elements.message] : [titleButton, elements.button];
  document.documentElement.requestFullscreen = () => {
    calls.push("enter");
    if (fail) return Promise.reject(new Error("NotAllowedError"));
    document.fullscreenElement = document.documentElement;
    listeners.get("fullscreenchange")();
    return Promise.resolve();
  };
  document.exitFullscreen = () => {
    calls.push("exit");
    document.fullscreenElement = null;
    listeners.get("fullscreenchange")();
    return Promise.resolve();
  };
  vm.runInContext(source, c);
  return { ...elements, calls, titleButton, titleMessage };
}
async function startMatch(h, mode) {
  const c = h.context;
  c.butEventHandler("playFromStart", {});
  c.butEventHandler("countryChoice", { id: 0 });
  h.click(mode);
  h.click("difficulty", { level: "medium" });
  if (mode === "world") {
    c.butEventHandler("playFromMap", {});
    c.butEventHandler("playFromGameIntro", {});
  } else h.click(mode === "finals" ? "play-final" : "play-handicap");
  await h.ticks(4);
  if (c.firstRun) c.butEventHandler("tickFromTut", {});
  assert.equal(c.gameState, "game");
}

test("pause fullscreen enters/exits without resuming, and disappears on resume/restart/quit in every mode", async () => {
  for (const size of [[1440, 900], [390, 844], [844, 390]]) for (const mode of ["world", "finals", "handicap"]) {
    const h = await boot(...size), c = h.context;
    await startMatch(h, mode);
    const ui = connectFullscreen(h);
    assert.equal(ui.controls.hidden, true);
    c.initPause();
    const ball = c.ball, score = [c.oGameData.userScore, c.oGameData.enemyScore];
    assert.equal(ui.controls.hidden, false);
    assert.equal(ui.button.textContent, "Full screen");
    assert.equal(h.flow.hidden, true, "The original canvas pause menu stays visible");
    ui.button.listeners.get("click")();
    assert.deepEqual(ui.calls, ["enter"], "Fullscreen must be requested during the click");
    await settle();
    assert.equal(ui.button.textContent, "Exit full screen");
    assert.equal(ui.titleButton.textContent, "Exit full screen", "All toggles share the current state");
    assert.equal(ui.button["aria-pressed"], "true");
    await h.ticks(4);
    assert.equal(c.gameState, "pause");
    ui.button.listeners.get("click")();
    await settle();
    assert.deepEqual(ui.calls, ["enter", "exit"]);
    assert.equal(ui.button.textContent, "Full screen");
    assert.equal(c.gameState, "pause");
    assert.equal(c.ball, ball);
    assert.deepEqual([c.oGameData.userScore, c.oGameData.enemyScore], score);
    for (const action of ["playFromPause", "restartFromPause", "quitFromPause"]) {
      c.butEventHandler(action, {});
      assert.equal(ui.controls.hidden, true, action);
      await h.ticks(4);
      if (action !== "quitFromPause") {
        assert.equal(c.gameState, "game");
        c.initPause();
        assert.equal(ui.controls.hidden, false);
      }
    }
  }
});

test("pause fullscreen reports blocked requests on the visible pause screen and preserves the match", async () => {
  const h = await boot(390, 844), c = h.context;
  await startMatch(h, "finals");
  const ui = connectFullscreen(h, true);
  c.initPause();
  ui.button.listeners.get("click")();
  await settle();
  assert.equal(c.gameState, "pause");
  assert.equal(ui.controls.hidden, false);
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.button.textContent, "Full screen");
  assert.match(ui.message.textContent, /Full screen was blocked/);
  assert.equal(ui.titleMessage.textContent, ui.message.textContent);
  c.butEventHandler("playFromPause", {});
  assert.equal(c.gameState, "game");
  assert.equal(ui.controls.hidden, true);
});

test("unsupported browsers retain the original pause menu without an unusable toggle", async () => {
  const h = await boot(390, 844);
  await startMatch(h, "world");
  h.context.initPause();
  assert.equal(h.context.gameState, "pause");
  assert.equal(pauseElements(h).controls.hidden, true);
  h.context.butEventHandler("playFromPause", {});
  assert.equal(h.context.gameState, "game");
});
