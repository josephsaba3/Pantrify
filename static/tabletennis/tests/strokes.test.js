(() => {
  "use strict";
  const { assert, describe, it } = window.BrowserTests;
  const { MatchEngine, getDifficulty, BALL_RADIUS, TABLE_LENGTH, NET_Z } = window.RallyEleven;

  function engine() {
    return new MatchEngine(getDifficulty("club"), "counter", 0, () => 0.5);
  }

  function hit(vx = 0, vy = 0, { duration = 0.04, rate = 120, dwell = 0, contactX = 0, contactY = 0.36 } = {}) {
    const match = engine();
    const steps = Math.max(1, Math.round(duration * rate));
    const dt = duration / steps;
    match.placePlayerPaddle(-vx * duration, 0.36 - vy * duration);
    for (let step = 1; step <= steps; step++) {
      match.setPlayerPaddle(-vx * duration + vx * step * dt, 0.36 - vy * duration + vy * step * dt, dt);
      if (step < steps) match.update(dt);
    }
    for (let time = 0; time < dwell; time += 1 / 120) match.update(1 / 120);
    Object.assign(match.ball, { x: contactX, y: contactY, z: 0.16, vx: 0, vy: 0, vz: -4, active: true });
    // Move the whole stroke to the requested contact location, preserving its velocity.
    match.playerPaddle.x += contactX;
    match.playerPaddle.y += contactY - 0.36;
    for (const segment of match.playerStrokeSegments) {
      for (const point of [segment.start, segment.end]) {
        point.x += contactX;
        point.y += contactY - 0.36;
      }
    }
    match.bouncesSinceHit = 1;
    match.lastHitter = "opponent";
    const event = match.update(1 / 240).find(event => event.type === "paddle" && event.side === "player");
    assert.ok(event, "The incoming ball should contact the paddle");
    return { match, event };
  }

  function freeBall(spin = 0, topspin = 0, bouncing = false) {
    const match = engine();
    Object.assign(match.ball, {
      x: 0, y: bouncing ? 0.04 : 0.6, z: 1.8,
      vx: 0, vy: bouncing ? -1.5 : 0, vz: 3, spin, topspin, active: true,
    });
    match.lastHitter = "player";
    match.bouncesSinceHit = 0;
    return match;
  }

  describe("stroke power and spin", () => {
    it("increases slice spin without turning lateral movement into forward power", () => {
      const block = hit().event;
      const slow = hit(1.5).event;
      const medium = hit(4).event;
      const fast = hit(8).event;
      assert.equal(block.shot, "Block");
      assert.equal(block.spin, 0);
      for (const [lower, higher] of [[block, slow], [slow, medium], [medium, fast]]) {
        assert.ok(higher.spin > lower.spin, "Faster slices must impart more spin");
        assert.ok(Math.abs(higher.power - lower.power) < 0.01, "Lateral movement must not add forward power");
      }
      assert.ok(fast.speed < block.speed * 1.2, "A fast brush must remain close to block pace");
    });

    it("reverses sidespin with slice direction", () => {
      const left = hit(-6).event;
      const right = hit(6).event;
      assert.ok(left.spin < 0 && right.spin > 0);
      assert.ok(Math.abs(left.spin + right.spin) < 0.001);
    });

    it("creates topspin up, backspin down, and combined spin diagonally", () => {
      assert.ok(hit(0, 6).event.topspin > 0);
      assert.ok(hit(0, -6).event.topspin < 0);
      const diagonal = hit(4, -4).event;
      assert.ok(diagonal.spin > 0 && diagonal.topspin < 0);
      assert.equal(diagonal.shot, "Backspin + sidespin");
      assert.ok(Math.abs(hit(0, -6).event.topspin) > Math.abs(hit(0, -2).event.topspin));
    });

    it("loses swing power when the paddle stops before contact", () => {
      const fresh = hit(0, 8).event;
      const stale = hit(0, 8, { dwell: 0.3 }).event;
      assert.equal(stale.shot, "Block");
      assert.equal(stale.spin, 0);
      assert.equal(stale.topspin, 0);
      assert.ok(stale.speed < fresh.speed * 0.75);
    });

    it("does not turn a tap, pause reset, or serve into a powered swipe", () => {
      const match = hit(8).match;
      match.placePlayerPaddle(-0.8, 0.7);
      assert.equal(match.playerPaddle.vx, 0);
      assert.equal(match.playerPaddle.vy, 0);
      assert.equal(match.playerStrokeSegments.length, 0);
      match.setPlayerPaddle(0, 0.3, 0.02);
      match.resetPlayerStroke();
      assert.equal(match.playerPaddle.vx, 0);
      match.waitingForServe = true;
      match.serve();
      assert.equal(match.ball.spin, 0);
      assert.equal(match.ball.topspin, 0);
    });

    it("gives the same stroke result at different input sample rates", () => {
      const shots = [30, 60, 120, 240].map(rate => hit(6, 0, { duration: 0.1, rate }));
      for (const shot of shots) {
        // The first touch position can change steering slightly; stroke power
        // and spin must remain independent of input sampling frequency.
        assert.ok(Math.abs(shot.match.ball.vz - shots[0].match.ball.vz) < 0.01);
        assert.ok(Math.abs(shot.event.power - shots[0].event.power) < 0.01);
        assert.ok(Math.abs(shot.event.spin - shots[0].event.spin) < 0.01);
      }
    });

    it("bounds extreme input and retains positions with equal timestamps", () => {
      const match = engine();
      match.setPlayerPaddle(0.5, 0.3, 0);
      match.setPlayerPaddle(Infinity, 0.3, 0.01);
      assert.ok(Math.abs(match.playerPaddle.x - 0.5) < 1e-9);
      for (let i = 0; i < 30; i++) match.setPlayerPaddle(i % 2 ? -100 : 100, i % 2 ? 100 : -100, 0.0001);
      match.playerReturn();
      assert.ok(Math.hypot(match.ball.spin, match.ball.topspin) <= 18.0001);
      assert.ok(Math.hypot(match.ball.vx, match.ball.vy, match.ball.vz) <= window.RallyEleven.MAX_BALL_SPEED + 1e-9);
      assert.ok(Object.values(match.ball).every(value => typeof value !== "number" || Number.isFinite(value)));
    });
  });

  describe("spin flight and bounce", () => {
    it("curves the flight more with stronger sidespin", () => {
      const left = freeBall(-12);
      const light = freeBall(4);
      const right = freeBall(12);
      for (const match of [left, light, right]) match.update(0.1);
      assert.ok(left.ball.x < 0 && right.ball.x > 0);
      assert.ok(right.ball.x > light.ball.x * 2);
      assert.ok(right.ball.spin < 12, "Spin should gradually decay");
    });

    it("dips with topspin and floats with backspin", () => {
      const top = freeBall(0, 12);
      const flat = freeBall();
      const back = freeBall(0, -12);
      for (const match of [top, flat, back]) match.update(0.1);
      assert.ok(top.ball.y < flat.ball.y && flat.ball.y < back.ball.y);
    });

    it("kicks sideways on the table in the slice direction", () => {
      const left = freeBall(-12, 0, true);
      const right = freeBall(12, 0, true);
      for (const match of [left, right]) assert.ok(match.update(1 / 30).some(event => event.type === "table"));
      assert.ok(left.ball.vx < -0.3 && right.ball.vx > 0.3);
    });

    it("kicks forward with topspin and checks speed with backspin", () => {
      const top = freeBall(0, 12, true);
      const flat = freeBall(0, 0, true);
      const back = freeBall(0, -12, true);
      for (const match of [top, flat, back]) assert.ok(match.update(1 / 30).some(event => event.type === "table"));
      assert.ok(top.ball.vz > flat.ball.vz && flat.ball.vz > back.ball.vz);
    });

    it("keeps representative blocks and slices playable at 30, 60, and 144 FPS", () => {
      for (const rate of [30, 60, 144]) {
        for (const [vx, vy, contactX, contactY] of [[0, 0, 0, 0.36], [8, 0, 0, 0.36], [-8, 0, 0, 0.36], [0, 6, 0, 0.36], [0, -6, 0, 0.36], [4, -4, 0, 0.36], [6, 0, 0.5, 0.15], [-6, 0, -0.5, 0.15], [0, -6, 0, 0.08], [0, 6, 0, 0.55]]) {
          const { match } = hit(vx, vy, { contactX, contactY });
          let landed = false;
          for (let time = 0; time < 1 && match.ball.active; time += 1 / rate) {
            const events = match.update(1 / rate);
            if (events.some(event => event.type === "table" && event.side === "opponent")) {
              landed = true;
              assert.ok(match.ball.z > NET_Z && match.ball.z <= TABLE_LENGTH + 0.15);
              assert.ok(match.ball.y >= BALL_RADIUS);
              break;
            }
          }
          assert.ok(landed, `Stroke ${vx},${vy} at ${contactX},${contactY} should land at ${rate} FPS`);
        }
      }
    });
  });
})();
