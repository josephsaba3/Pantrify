(() => {
  "use strict";
  const { assert, describe, it } = window.BrowserTests;
  const { MatchEngine, CourtRenderer, getDifficulty, PLAYER_PLANE, TABLE_LENGTH } = window.RallyEleven;
  const sizes = [[1440, 900], [390, 844], [844, 390]];
  function setup({ size = sizes[0], z = 0.7, y = 0.5, x = 0, incomingPace = 4, spin = 0, topspin = 0 } = {}) {
    const match = new MatchEngine(getDifficulty("club"), "counter", 0, () => 0.5);
    match.court.resize(...size);
    match.placePlayerPaddle(0, 0.36);
    const ball = { x, y, z, vx: 0, vy: 0, vz: -incomingPace, spin, topspin, active: true };
    return { match, ball };
  }
  function shot(vx = 0, vy = 0, options = {}) {
    const { match, ball } = setup(options);
    const screen = match.court.project(ball);
    const pixelsPerUnit = Math.min(...(options.size ?? sizes[0])) / 1.55;
    const duration = 0.04;
    const point = t => match.court.screenToPaddle(screen.x - vx * pixelsPerUnit * (duration - t), screen.y + vy * pixelsPerUnit * (duration - t));
    const start = point(0);
    match.placePlayerPaddle(start.x, start.y);
    for (let i = 1; i <= 8; i++) {
      const next = point(i * duration / 8);
      match.setPlayerPaddle(next.x, next.y, duration / 8);
      if (i < 8) match.update(duration / 8);
    }
    Object.assign(match.ball, ball);
    match.bouncesSinceHit = 1;
    match.lastHitter = "opponent";
    const event = match.update(1 / 240).find(e => e.type === "paddle" && e.side === "player");
    assert.ok(event, "The final brush must contact the ball");
    return { match, event, launch: { ...match.ball } };
  }
  function landing(match, side = "opponent", rate = 240) {
    for (let t = 0; t < 3 && match.ball.active; t += 1 / rate) {
      if (match.update(1 / rate).some(e => e.type === "table" && e.side === side)) return { ...match.ball };
    }
    return null;
  }

  describe("stroke feel and placement", () => {
    it("gives equivalent screen swipes the same pace and spin across viewports", () => {
      for (const [vx, vy] of [[6, 0], [0, 6], [0, -6], [4, 4], [-4, -4]]) {
        const shots = sizes.map(size => shot(vx, vy, { size }));
        for (const current of shots) {
          assert.ok(Math.abs(current.launch.vz - shots[0].launch.vz) < 0.015, "Power must not depend on aspect ratio");
          assert.ok(Math.abs(current.event.spin - shots[0].event.spin) < 0.015, "Sidespin must not depend on aspect ratio");
          assert.ok(Math.abs(current.event.topspin - shots[0].event.topspin) < 0.015, "Topspin must not depend on aspect ratio");
        }
      }
    });

    it("separates fast drives, lateral brushes, and undercuts at equal swipe speed", () => {
      const drive = shot(0, 8);
      const side = shot(8, 0);
      const cut = shot(0, -8);
      assert.equal(drive.event.shot, "Topspin smash");
      assert.ok(drive.launch.vz > side.launch.vz && side.launch.vz > cut.launch.vz);
      assert.ok(drive.launch.vz > cut.launch.vz * 1.15, "Drive and undercut must remain distinct within the speed cap");
      const driveLanding = landing(drive.match);
      const cutLanding = landing(cut.match);
      assert.ok(driveLanding && cutLanding);
      assert.ok(driveLanding.z > cutLanding.z + 0.2, "Undercuts should land shorter");
      assert.ok(driveLanding.vz > drive.launch.vz, "Topspin must kick forward on the bounce");
      assert.ok(cutLanding.vz < cut.launch.vz * 0.85, "Backspin must check the bounce");
    });

    it("responds progressively to faster short forward strokes", () => {
      const shots = [0, 2, 4, 8].map(speed => shot(0, speed));
      for (let i = 1; i < shots.length; i++) {
        assert.ok(shots[i].launch.vz > shots[i - 1].launch.vz);
        assert.ok(shots[i].event.power > shots[i - 1].event.power);
        assert.ok(shots[i].event.topspin > shots[i - 1].event.topspin);
      }
      assert.ok(shots[3].launch.vz > shots[0].launch.vz * 1.35);
    });

    it("trades sideways brush for power as a stroke moves forward", () => {
      const shots = [0, 2, 6].map(forward => shot(6, forward));
      for (let i = 1; i < shots.length; i++) {
        assert.ok(shots[i].launch.vz > shots[i - 1].launch.vz);
        assert.ok(shots[i].event.spin < shots[i - 1].event.spin);
      }
      assert.ok(shots[2].event.spin < shots[0].event.spin * 0.25, "A hard diagonal must not combine full sidespin and smash pace");
      assert.ok(shots[2].event.spin > 0 && shots[2].event.topspin > 0, "Diagonal control must still allow mixed spin");
    });

    it("lets the paddle contact position steer a stationary block", () => {
      const results = [-0.65, 0, 0.65].map(offset => {
        const { match, ball } = setup();
        Object.assign(match.ball, ball);
        match.bouncesSinceHit = 1;
        match.lastHitter = "opponent";
        const screen = match.court.project(ball);
        const paddle = match.court.screenToPaddle(screen.x - offset * match.court.paddleShape().x, screen.y);
        match.placePlayerPaddle(paddle.x, paddle.y);
        assert.ok(match.update(1 / 240).some(e => e.type === "paddle"));
        return landing(match);
      });
      assert.ok(results.every(Boolean));
      assert.ok(results[0].x < results[1].x - 0.035 && results[2].x > results[1].x + 0.035);
      assert.ok(results[2].x - results[0].x < 0.15, "Paddle-edge contact must make a small correction, not choose the entire direction");
    });

    it("curves stronger slices more while keeping their first bounce on the table", () => {
      const weak = shot(3.5);
      const strong = shot(8);
      const bends = [weak, strong].map(current => {
        const { x, vx } = current.match.ball;
        for (let i = 0; i < 24; i++) current.match.update(1 / 240);
        return current.match.ball.x - x - vx * 0.1;
      });
      assert.ok(bends[1] > bends[0] * 2 && bends[0] > 0);
      for (const current of [weak, strong]) {
        const bounce = landing(current.match);
        assert.ok(bounce && Math.abs(bounce.x) < 0.7625);
      }
    });

    it("lets incoming pace and spin affect a passive block", () => {
      const slow = shot(0, 0, { incomingPace: 3 });
      const fast = shot(0, 0, { incomingPace: 7 });
      const spinning = shot(0, 0, { spin: 10, topspin: 8 });
      assert.ok(fast.launch.vz > slow.launch.vz + 0.3);
      assert.ok(spinning.event.spin > 0 && spinning.event.topspin < 0);
      assert.ok(Math.hypot(spinning.event.spin, spinning.event.topspin) < 3, "The paddle should absorb most incoming spin");
    });

    it("keeps assisted returns playable across contact heights, depths, and frame rates", () => {
      for (const rate of [30, 60, 144]) for (const z of [-0.1, 0.16, 0.7, 1.2]) for (const y of [0.08, 0.5]) {
        for (const [vx, vy] of [[0, 0], [8, 0], [-8, 0], [0, 8], [0, -8], [6, -6]]) {
          const { match, ball } = setup({ z, y });
          Object.assign(match.ball, ball);
          match.playerReturn({ vx, vy, offsetX: 0 });
          match.lastHitter = "player";
          match.bouncesSinceHit = 0;
          assert.ok(Object.values(match.ball).every(value => typeof value !== "number" || Number.isFinite(value)));
          const bounce = landing(match, "opponent", rate);
          assert.ok(bounce, `Stroke ${vx},${vy} at ${z},${y} must land at ${rate} FPS`);
        }
      }
    });

    it("gives opponents legal returns with meaningful spin for each difficulty and style", () => {
      for (const difficulty of ["rookie", "club", "pro", "legend"]) for (const style of ["counter", "angle", "spinner", "smash"]) {
        const match = new MatchEngine(getDifficulty(difficulty), style, 0, () => 0.4);
        Object.assign(match.ball, { x: 0.2, y: 0.35, z: TABLE_LENGTH - 0.075, vx: 0, vy: 0, vz: 5, spin: 10, topspin: 8, active: true });
        match.opponentReturn();
        match.lastHitter = "opponent";
        match.bouncesSinceHit = 0;
        assert.ok(Math.abs(match.ball.spin) > 1);
        if (style === "smash") assert.ok(match.ball.topspin > 0);
        if (style === "spinner") assert.ok(match.ball.topspin < 0);
        assert.ok(landing(match, "player"), `${difficulty} ${style} return must land on the player side`);
      }
    });

    it("anchors the ball shadow to the table and scales contact feedback with power", () => {
      const calls = [];
      const ctx = new Proxy({}, { get(target, name) {
        if (name in target) return target[name];
        return (...args) => calls.push({ name, args });
      } });
      const { match, ball } = setup();
      const renderer = new CourtRenderer({ getContext: () => ctx }, match.court);
      renderer.width = 1440;
      renderer.height = 900;
      renderer.drawBall(ball);
      const shadow = calls.find(call => call.name === "ellipse");
      const ground = match.court.project({ ...ball, y: 0 });
      assert.ok(Math.abs(shadow.args[0] - ground.x) < 0.001 && Math.abs(shadow.args[1] - ground.y - 2) < 0.001);
      const rings = [0.7, 1.8].map(power => {
        calls.length = 0;
        renderer.flashContact(ball, power);
        renderer.contactFlash = 0.5;
        renderer.drawContact();
        return calls.find(call => call.name === "arc").args[2];
      });
      assert.ok(rings[1] > rings[0], "Power shots need stronger visible contact feedback");
    });

    it("advances real rallies and scoring across difficulties and opponent styles", () => {
      for (const difficulty of ["rookie", "club", "pro", "legend"]) for (const style of ["counter", "spinner", "smash"]) {
        let seed = 98237;
        const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        const match = new MatchEngine(getDifficulty(difficulty), style, 0, rng);
        let rallyContacts = 0;
        let opponentContacts = 0;
        for (let frame = 0; frame < 6000 && match.totalPoints < 3; frame++) {
          if (match.waitingForServe) { match.serve(); rallyContacts = 0; }
          if (match.ball.active && match.ball.vz < 0) {
            const screen = match.court.project(match.ball);
            // Return several balls, then deliberately miss to exercise point/serve transitions.
            const paddle = rallyContacts < 6 ? match.court.screenToPaddle(screen.x, screen.y)
              : match.court.screenToPaddle(100, 180);
            match.placePlayerPaddle(paddle.x, paddle.y);
          }
          for (const event of match.update(1 / 120)) {
            if (event.type === "paddle") {
              rallyContacts++;
              if (event.side === "opponent") opponentContacts++;
            }
          }
          assert.ok(Object.values(match.ball).every(value => typeof value !== "number" || Number.isFinite(value)));
        }
        assert.equal(match.totalPoints, 3, `${difficulty} ${style} rallies must finish and restart`);
        assert.ok(opponentContacts > 0, `${difficulty} ${style} must actually return the ball`);
      }
    });
  });
})();
