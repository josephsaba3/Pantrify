(() => {
  "use strict";
  const { assert, describe, it } = window.BrowserTests;
  const { MatchEngine, getDifficulty, TABLE_HALF_WIDTH, TABLE_LENGTH, MAX_BALL_SPEED, MAX_RETURN_PACE } = window.RallyEleven;
  function engine(difficulty = "club") {
    return new MatchEngine(getDifficulty(difficulty), "counter", 0, () => 0.5);
  }
  function launch(vx, vy, { x = 0, y = 0.5, z = 0.7, offsetX = 0, difficulty = "club" } = {}) {
    const match = engine(difficulty);
    Object.assign(match.ball, { x, y, z, vx: 0, vy: 0, vz: -4, spin: 0, topspin: 0, active: true });
    match.playerReturn({ vx, vy, offsetX });
    match.lastHitter = "player";
    match.bouncesSinceHit = 0;
    return match;
  }
  function until(match, predicate, rate = 240, seconds = 3) {
    for (let time = 0; time < seconds && match.ball.active; time += 1 / rate) {
      const event = match.update(1 / rate).find(predicate);
      if (event) return event;
    }
    return null;
  }
  function dropping(x, z = 2) {
    const match = engine();
    Object.assign(match.ball, { x, y: 0.04, z, vx: 0, vy: -1, vz: 0, active: true });
    match.lastHitter = "player";
    match.bouncesSinceHit = 0;
    return match;
  }

  describe("bounded speed and table edges", () => {
    it("caps total ball speed at launch, in curved flight, and after spin kicks", () => {
      for (const rate of [30, 60, 144]) for (const [vx, vy] of [[8, 0], [0, 8], [0, -8], [120, 0], [0, 120], [80, 80]]) {
        const match = launch(vx, vy);
        assert.ok(Math.abs(match.ball.vz) <= MAX_RETURN_PACE + 1e-9);
        let bounced = false;
        for (let t = 0; t < 1.5 && match.ball.active; t += 1 / rate) {
          assert.ok(Math.hypot(match.ball.vx, match.ball.vy, match.ball.vz) <= MAX_BALL_SPEED + 1e-9, `Speed must stay capped at ${rate} FPS`);
          if (match.update(1 / rate).some(e => e.type === "table")) bounced = true;
        }
        assert.ok(bounced, "The speed ceiling must also be checked through a bounce");
      }
    });

    it("levels off pace before excessive swipe speed can overpower returns", () => {
      for (const direction of [[1, 0], [0, 1], [0, -1]]) {
        const shots = [6.2, 12, 120].map(speed => launch(direction[0] * speed, direction[1] * speed));
        for (const shot of shots) assert.ok(Math.abs(shot.ball.vz - shots[0].ball.vz) < 0.025);
        assert.ok(Math.hypot(shots[1].ball.spin, shots[1].ball.topspin) > Math.hypot(shots[0].ball.spin, shots[0].ball.topspin), "Brush speed may still add spin after pace saturates");
      }
    });

    it("keeps hard sideways, forward, and diagonal strokes defendable", () => {
      for (const difficulty of ["club", "legend"]) for (const [vx, vy] of [[12, 0], [0, 12], [8, 8]]) {
        let returned = 0;
        let total = 0;
        for (const x of [-0.3, 0, 0.3]) for (const y of [0.25, 0.5, 0.7]) for (const z of [0.16, 0.7]) {
          const match = launch(vx, vy, { x, y, z, difficulty });
          total++;
          if (until(match, e => e.type === "paddle" && e.side === "opponent")) returned++;
        }
        assert.ok(returned >= total * 0.75, `${difficulty} must defend most hard ${vx},${vy} strokes: ${returned}/${total}`);
      }
    });

    it("allows line placement and outward misses on both sidelines", () => {
      for (const sign of [-1, 1]) {
        const onLine = launch(sign * 8, 0, { x: sign * 0.28, y: 0.36, z: 0.16 });
        const bounce = until(onLine, e => e.type === "table");
        assert.ok(bounce, "A controlled line shot should land");
        assert.ok(Math.abs(bounce.position.x) > TABLE_HALF_WIDTH - 0.04, "Placement must reach the sideline");
        const wide = launch(sign * 8, 0, { x: sign * 0.5, y: 0.36, z: 0.16, offsetX: sign * 0.5 });
        const point = until(wide, e => e.type === "point");
        assert.ok(point && point.scorer === "opponent" && point.reason === "wide", "Outward placement must be able to miss");
      }
    });

    it("distinguishes an inside bounce, a finite-ball edge graze, and a clear miss", () => {
      for (const rate of [30, 60, 144]) for (const sign of [-1, 1]) {
        const inside = until(dropping(sign * (TABLE_HALF_WIDTH - 0.005)), e => e.type === "table", rate);
        assert.ok(inside && !inside.edge);
        const graze = until(dropping(sign * (TABLE_HALF_WIDTH + 0.01)), e => e.type === "table", rate);
        assert.ok(graze && graze.edge && graze.position.y > 0 && graze.position.y < 0.02);
        const miss = until(dropping(sign * (TABLE_HALF_WIDTH + 0.03)), e => e.type === "table" || e.type === "point", rate);
        assert.ok(miss && miss.type === "point" && miss.scorer === "opponent" && miss.reason === "wide");
      }
    });

    it("uses the rounded ball at corners instead of accepting every overhanging square", () => {
      const graze = until(dropping(TABLE_HALF_WIDTH + 0.012, TABLE_LENGTH + 0.012), e => e.type === "table");
      assert.ok(graze && graze.edge);
      const miss = until(dropping(TABLE_HALF_WIDTH + 0.016, TABLE_LENGTH + 0.016), e => e.type === "point");
      assert.ok(miss && miss.scorer === "opponent");
    });

    it("lets the opponent return a bounce beyond its usual paddle plane", () => {
      const match = engine();
      Object.assign(match.ball, { x: 0, y: 0.04, z: TABLE_LENGTH - 0.04, vx: 0, vy: -1, vz: 1, active: true });
      match.opponentPaddle.y = 0.08;
      match.lastHitter = "player";
      match.bouncesSinceHit = 0;
      assert.ok(until(match, e => e.type === "table"));
      assert.ok(until(match, e => e.type === "paddle" && e.side === "opponent"), "Back-edge bounce must remain reachable");
    });

    it("lets the player reach outside the sideline while a misplaced paddle misses", () => {
      for (const size of [[1440, 900], [390, 844], [844, 390]]) for (const sign of [-1, 1]) {
        for (const cover of [true, false]) {
          const match = engine();
          match.court.resize(...size);
          Object.assign(match.ball, { x: sign * (TABLE_HALF_WIDTH + 0.12), y: 0.22, z: 0.12, vx: 0, vy: 0, vz: -3, active: true });
          match.lastHitter = "opponent";
          match.bouncesSinceHit = 1;
          const screen = match.court.project(match.ball);
          const paddle = match.court.screenToPaddle(cover ? screen.x : size[0] / 2, screen.y);
          match.placePlayerPaddle(paddle.x, paddle.y);
          const event = until(match, e => e.type === "paddle" || e.type === "point");
          assert.ok(event && (cover ? event.type === "paddle" && event.side === "player" : event.type === "point" && event.scorer === "opponent"));
        }
      }
    });

    it("scores long shots against their hitter and legal edge bounces against a missing receiver", () => {
      for (const playerHit of [true, false]) for (const bounced of [false, true]) {
        const match = engine();
        const hitter = playerHit ? "player" : "opponent";
        Object.assign(match.ball, { x: 0, y: 0.7, z: playerHit ? TABLE_LENGTH + 0.23 : -0.23, vx: 0, vy: 0, vz: playerHit ? 5 : -5, active: true });
        match.lastHitter = hitter;
        match.bouncesSinceHit = bounced ? 1 : 0;
        const event = until(match, e => e.type === "point");
        assert.ok(event);
        assert.equal(event.scorer, bounced ? hitter : playerHit ? "opponent" : "player");
        assert.equal(event.reason, bounced ? "missed return" : "long");
      }
      const edge = dropping(TABLE_HALF_WIDTH + 0.01);
      assert.ok(until(edge, e => e.type === "table" && e.edge));
      const point = until(edge, e => e.type === "point");
      assert.ok(point && point.scorer === "player", "A legal edge bounce followed by a missed return belongs to the hitter");
    });
  });
})();
