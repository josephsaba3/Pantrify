(() => {
  "use strict";
  const { assert, describe, it } = window.BrowserTests;
  const { CourtGeometry, CourtRenderer, MatchEngine, MatchGame, getDifficulty, PLAYER_PLANE, NET_Z, TABLE_LENGTH } = window.RallyEleven;
  const sizes = [[1440, 900], [390, 844], [844, 390]];
  const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-7, `${message}: ${a} vs ${b}`);
  function engine(width = 1440, height = 900) {
    const match = new MatchEngine(getDifficulty("club"), "counter", 0, () => 0.5);
    match.court.resize(width, height);
    match.placePlayerPaddle(0, 0.36);
    return match;
  }
  function incoming(match, z = 0.16, x = 0, y = 0.36) {
    Object.assign(match.ball, { x, y, z, vx: 0, vy: 0, vz: -4, spin: 0, topspin: 0, active: true });
    match.bouncesSinceHit = 1;
    match.lastHitter = "opponent";
  }
  function position(match, screenX, screenY, elapsed = null) {
    const p = match.court.screenToPaddle(screenX, screenY);
    if (elapsed === null) match.placePlayerPaddle(p.x, p.y);
    else match.setPlayerPaddle(p.x, p.y, elapsed);
  }
  function hits(match, dt) {
    return match.update(dt).filter(event => event.type === "paddle" && event.side === "player");
  }
  function controller() {
    const match = engine();
    const listeners = {};
    const canvas = {
      width: 0, height: 0,
      getContext: () => ({ setTransform() {} }),
      getBoundingClientRect: () => ({ left: 40, top: 20, width: 1440, height: 900 }),
      addEventListener: (type, handler) => { listeners[type] = handler; },
      setPointerCapture: id => { canvas.capture = id; },
      hasPointerCapture: id => canvas.capture === id
    };
    const game = Object.create(MatchGame.prototype);
    Object.assign(game, {
      engine: match, canvas, renderer: new CourtRenderer(canvas, match.court),
      paused: false, complete: false, activePointerId: null, lastPointerTime: null,
      requireElement: () => ({ addEventListener() {} })
    });
    game.bindControls();
    const send = (type, x, y, timeStamp, extra = {}) => listeners[type]({
      type, clientX: x + 40, clientY: y + 20, timeStamp, pointerId: 1, pointerType: "touch", ...extra
    });
    return { game, match, send };
  }

  describe("paddle control and visible contact", () => {
    it("tracks the pointer throughout a broad area on desktop and both phone orientations", () => {
      for (const [width, height] of sizes) {
        const court = new CourtGeometry();
        court.resize(width, height);
        const bounds = court.paddleBounds();
        assert.ok(bounds.bottom - bounds.top > height * 0.55, "Vertical control should span most of the playing area");
        for (const xf of [0.2, 0.5, 0.8]) for (const yf of [0.3, 0.5, 0.7]) {
          const mapped = court.screenToPaddle(width * xf, height * yf);
          const drawn = court.project({ ...mapped, z: PLAYER_PLANE });
          close(drawn.x, width * xf, "Paddle must follow pointer X");
          close(drawn.y, height * yf, "Paddle must follow pointer Y");
        }
        for (const [x, y] of [[-1000, -1000], [width + 1000, height + 1000]]) {
          const drawn = court.project({ ...court.screenToPaddle(x, y), z: PLAYER_PLANE });
          assert.ok(drawn.x >= bounds.left - 1e-7 && drawn.x <= bounds.right + 1e-7);
          assert.ok(drawn.y >= bounds.top - 1e-7 && drawn.y <= bounds.bottom + 1e-7);
        }
      }
    });

    it("returns visibly overlapping bounced balls at different depths without teleporting them", () => {
      for (const size of sizes) for (const z of [-0.1, 0.16, 0.3, 0.5, 0.9]) {
        const match = engine(...size);
        incoming(match, z);
        const screen = match.court.project(match.ball);
        position(match, screen.x, screen.y);
        const events = hits(match, 1 / 240);
        assert.equal(events.length, 1, `Visible overlap should hit at z=${z}, ${size}`);
        const contact = match.court.project(events[0].position);
        close(contact.x, screen.x, "Contact X must stay where the ball was");
        close(contact.y, screen.y, "Contact Y must stay where the ball was");
        close(match.ball.z, z, "Return must start at the contact depth");
      }
    });

    it("rejects a ball clearly outside the drawn paddle on every viewport", () => {
      for (const size of sizes) for (const axis of ["x", "y"]) {
        const match = engine(...size);
        incoming(match);
        const screen = match.court.project(match.ball);
        const shape = match.court.paddleShape();
        screen[axis] -= shape[axis] + match.court.ballRadius(match.ball) + 12;
        position(match, screen.x, screen.y);
        assert.equal(hits(match, 1 / 240).length, 0, `Visible ${axis} gap must miss at ${size}`);
      }
    });

    it("retains an across-and-back swipe and uses the direction at impact at 30, 60, and 144 FPS", () => {
      for (const rate of [30, 60, 144]) {
        const match = engine();
        incoming(match);
        const ball = match.court.project(match.ball);
        position(match, ball.x - 250, ball.y);
        position(match, ball.x + 250, ball.y, 1 / rate / 2);
        position(match, ball.x - 250, ball.y, 1 / rate / 2);
        const events = hits(match, 1 / rate);
        assert.equal(events.length, 1, "Both halves of the swipe must survive until physics runs");
        assert.ok(events[0].spin > 0, "First rightward contact must not inherit the final leftward stroke");
      }
    });

    it("does not invent a hit when the actual swipe travels around the ball", () => {
      for (const rate of [30, 60, 144]) {
        const match = engine();
        incoming(match);
        const ball = match.court.project(match.ball);
        position(match, ball.x - 250, ball.y);
        position(match, ball.x - 250, ball.y - 180, 1 / rate / 3);
        position(match, ball.x + 250, ball.y - 180, 1 / rate / 3);
        position(match, ball.x + 250, ball.y, 1 / rate / 3);
        assert.equal(hits(match, 1 / rate).length, 0, "The chord between endpoints must not count as a stroke");
      }
    });

    it("uses the returning stroke direction when contact happens after a reversal", () => {
      const match = engine();
      incoming(match);
      const ball = match.court.project(match.ball);
      position(match, ball.x - 250, ball.y - 150);
      position(match, ball.x + 250, ball.y - 150, 0.008);
      position(match, ball.x - 250, ball.y, 0.008);
      const events = hits(match, 0.016);
      assert.equal(events.length, 1);
      assert.ok(events[0].spin < 0 && events[0].topspin < 0, "Down-left brush must impart left sidespin and backspin");
    });

    it("expires an unused swipe instead of hitting a later incoming ball", () => {
      const match = engine();
      incoming(match);
      const ball = match.court.project(match.ball);
      match.ball.active = false;
      position(match, ball.x - 250, ball.y);
      position(match, ball.x + 250, ball.y, 1 / 60);
      match.update(1 / 60);
      incoming(match);
      assert.equal(hits(match, 1 / 60).length, 0);
    });

    it("preserves recent stroke power until a later pointer sample takes effect", () => {
      const match = engine();
      match.placePlayerPaddle(-0.3, 0.36);
      match.setPlayerPaddle(0, 0.36, 0.03);
      match.update(0.03);
      incoming(match, PLAYER_PLANE);
      match.setPlayerPaddle(0.01, 0.36, 0.001);
      const events = hits(match, 1 / 60);
      assert.equal(events.length, 1);
      assert.ok(events[0].spin > 1, "A later sample must not erase the velocity at an earlier impact");
    });

    it("requires an incoming ball with one bounce and prevents double hits", () => {
      for (const [bounces, vz, z] of [[0, -4, 0.3], [2, -4, 0.3], [1, 4, 0.3], [1, -4, 1.5]]) {
        const match = engine();
        incoming(match, z);
        match.bouncesSinceHit = bounces;
        match.ball.vz = vz;
        const ball = match.court.project(match.ball);
        position(match, ball.x, ball.y);
        assert.equal(hits(match, 1 / 240).length, 0);
      }
      const match = engine();
      incoming(match, 0.3);
      const ball = match.court.project(match.ball);
      position(match, ball.x, ball.y);
      assert.equal(hits(match, 1 / 240).length, 1);
      assert.equal(hits(match, 1 / 60).length, 0);
    });

    it("keeps early, late, low, and off-centre returns playable", () => {
      for (const rate of [30, 60, 144]) for (const z of [-0.1, 0.16, 0.5, 0.9]) for (const x of [-0.5, 0, 0.5]) {
        const match = engine();
        incoming(match, z, x, 0.08);
        const ball = match.court.project(match.ball);
        position(match, ball.x, ball.y);
        assert.equal(hits(match, 1 / 240).length, 1);
        let landed = false;
        for (let t = 0; t < 1.5 && match.ball.active; t += 1 / rate) {
          const events = match.update(1 / rate);
          if (events.some(e => e.type === "table" && e.side === "opponent")) {
            landed = true;
            assert.ok(match.ball.z > NET_Z && match.ball.z <= TABLE_LENGTH);
            break;
          }
        }
        assert.ok(landed, `Return at ${x},${z} must land at ${rate} FPS`);
      }
    });
  });

  describe("pointer event integration", () => {
    it("draws the same face, tilt, and ball size used by contact geometry", () => {
      for (const [width, height] of sizes) {
        const calls = [];
        const ctx = new Proxy({}, { get(target, name) {
          if (name in target) return target[name];
          return (...args) => calls.push({ name, args });
        } });
        const match = engine(width, height);
        const renderer = new CourtRenderer({
          width: 0, height: 0, getContext: () => ctx,
          getBoundingClientRect: () => ({ left: 0, top: 0, width, height })
        }, match.court);
        renderer.resize();
        renderer.drawPaddle(0, 0.36, PLAYER_PLANE, "#ff5a36", true, 8);
        const face = calls.filter(call => call.name === "ellipse")[1];
        const shape = match.court.paddleShape(PLAYER_PLANE, 8);
        close(face.args[2], shape.x, "Drawn face width");
        close(face.args[3], shape.y, "Drawn face height");
        close(calls.find(call => call.name === "rotate").args[0], shape.angle, "Drawn tilt");
        incoming(match);
        calls.length = 0;
        renderer.drawBall(match.ball);
        close(calls.find(call => call.name === "arc").args[2], match.court.ballRadius(match.ball), "Drawn ball size");
        renderer.render(match, 1 / 60);
        assert.ok(calls.some(call => call.name === "clearRect"), "Full renderer must run without missing dependencies");
      }
    });

    it("keeps same-timestamp positions and every coalesced segment including the final event", () => {
      const { match, send } = controller();
      incoming(match);
      const ball = match.court.project(match.ball);
      send("pointerdown", ball.x - 250, ball.y, 100);
      send("pointermove", ball.x - 250, ball.y, 100, {
        getCoalescedEvents: () => [{ clientX: ball.x + 250 + 40, clientY: ball.y + 20, timeStamp: 100 }]
      });
      const end = match.court.project({ ...match.playerPaddle, z: PLAYER_PLANE });
      close(end.x, ball.x - 250, "Final event position must be applied");
      assert.equal(hits(match, 1 / 60).length, 1, "Equal timestamps must retain the swipe path");
      assert.ok(Number.isFinite(match.ball.spin));
    });

    it("uses the final touch release location and ignores unrelated pointers", () => {
      const { match, send } = controller();
      incoming(match);
      const ball = match.court.project(match.ball);
      send("pointerdown", ball.x - 250, ball.y, 100);
      send("pointermove", ball.x + 250, ball.y, 105, { pointerId: 2 });
      close(match.court.project({ ...match.playerPaddle, z: PLAYER_PLANE }).x, ball.x - 250, "Second finger must not move the paddle");
      send("pointerup", ball.x + 250, ball.y, 110);
      assert.equal(hits(match, 1 / 60).length, 1);
    });

    it("clears queued hits on cancellation and unexpected capture loss", () => {
      for (const type of ["pointercancel", "lostpointercapture"]) {
        const { match, send } = controller();
        incoming(match);
        const ball = match.court.project(match.ball);
        send("pointerdown", ball.x - 250, ball.y, 100);
        send("pointermove", ball.x + 250, ball.y, 110);
        send(type, ball.x + 250, ball.y, 111);
        assert.equal(hits(match, 1 / 60).length, 0);
        close(match.playerPaddle.vx, 0, "Cancelled stroke must not leave power behind");
      }
    });

    it("follows mouse hover without a button and keeps keyboard movement within bounds", () => {
      const { match, send } = controller();
      send("pointermove", 600, 300, 100, { pointerType: "mouse" });
      send("pointermove", 1000, 400, 110, { pointerType: "mouse" });
      const drawn = match.court.project({ ...match.playerPaddle, z: PLAYER_PLANE });
      close(drawn.x, 1000, "Hover X");
      close(drawn.y, 400, "Hover Y");
      for (let i = 0; i < 200; i++) send("keydown", 0, 0, 120 + i, { key: "ArrowUp", preventDefault() {} });
      close(match.court.project({ ...match.playerPaddle, z: PLAYER_PLANE }).y, match.court.paddleBounds().top, "Keyboard upper bound");
    });

    it("discards old movement when resizing and when resetting for pause or serve", () => {
      const match = engine();
      match.setPlayerPaddle(1, 1, 0.02);
      match.court.resize(844, 390);
      match.update(1 / 60);
      close(match.playerPaddle.vx, 0, "Resize must not create a stroke");
      assert.equal(match.playerStrokeSegments.length, 0);
      match.setPlayerPaddle(-1, 0.4, 0.02);
      match.resetPlayerStroke();
      assert.equal(match.playerStrokeSegments.length, 0);
      match.setPlayerPaddle(0, 0.3, 0.02);
      match.serve();
      assert.equal(match.playerStrokeSegments.length, 0);
    });
  });
})();
