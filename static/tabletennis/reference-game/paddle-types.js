// Player equipment and random CPU equipment, layered over the supplied game.
(() => {
  "use strict";
  const profiles = Object.freeze({
    balanced: Object.freeze({ label: "Balanced", color: "Green", description: "The original speed and spin.", sprite: "enemyBat2", enemyId: 2, speed: 1, spin: 1 }),
    spinny: Object.freeze({ label: "Spinny", color: "Red", description: "Easier spin from a sideways swipe.", sprite: "enemyBat4", enemyId: 4, speed: 1, spin: 1.05 }),
    speedy: Object.freeze({ label: "Speedy", color: "Blue", description: "A little extra pace on your shots.", sprite: "enemyBat0", enemyId: 0, speed: 1.04, spin: 1 })
  });
  const ids = Object.keys(profiles);
  const valid = id => Object.hasOwn(profiles, id);
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  let selected = window.famobi.localStorage.getItem("paddle:v1");
  if (!valid(selected)) selected = "balanced";
  function select(id) {
    if (!valid(id)) return false;
    selected = id;
    window.famobi.localStorage.setItem("paddle:v1", id);
    return true;
  }
  function equip(paddle, id) {
    paddle.paddleType = id;
    return paddle;
  }
  function enhance(shot, id) {
    const profile = profiles[id];
    return { ...shot, speed: shot.speed * profile.speed, spin: shot.spin * profile.spin };
  }

  const Player = Elements.UserBat;
  const playerShot = Player.prototype.getHitData;
  Elements.UserBat = function() {
    const paddle = equip(new Player(), selected);
    const source = paddle.oGameElementsImgData;
    const face = source.oData.oAtlasData[oImageIds[profiles[selected].sprite]];
    // Reuse the original red, blue and green paddle artwork. Give this player
    // its own atlas mapping so the shared table, ball and CPU art stay intact.
    paddle.oGameElementsImgData = { ...source, oData: { ...source.oData, oAtlasData: {
      ...source.oData.oAtlasData,
      [oImageIds.userBatCentre]: { ...face },
      [oImageIds.userBatEdge]: { x: face.x + 2, y: face.y + 2, width: 109, height: 110 }
    } } };
    return paddle;
  };
  Elements.UserBat.prototype = Player.prototype;
  Player.prototype.getHitData = function(...args) {
    const base = playerShot.apply(this, args);
    const id = this.paddleType;
    if (id === "balanced") return base;
    const shot = enhance(base, id);
    if (id === "spinny" && !forcedModeProperties?.override?.curve_mode && Number.isFinite(delta) && delta > 0) {
      const sideways = clamp((this.x - this.prevX) / delta / 3500, -1, 1);
      const forward = clamp((this.prevY - this.y) / delta / 4500, 0, 1);
      // The original threshold is 0.5. Lower it 10%, retaining swipe direction
      // and the normal reduction in spin on hard forward strokes. Maximum spin
      // rises only 5% because the source's ball curvature is cubic in spin.
      const amount = Math.max(0, (Math.abs(sideways) - 0.45) / 0.55);
      shot.spin = amount > 0 && forward < 0.5
        ? -Math.sign(sideways) * amount * (1 - 2 * forward) * profiles.spinny.spin : 0;
    }
    return shot;
  };

  // Load after difficulty.js: equipment enhances its cached stroke, preserving
  // the opponent's reaction, targeting, mistakes and difficulty profile.
  const Enemy = Elements.EnemyBat;
  Elements.EnemyBat = function() {
    const paddle = new Enemy();
    const id = ids[Math.floor(Math.random() * ids.length)];
    equip(paddle, id);
    paddle.id = profiles[id].enemyId;
    return paddle;
  };
  Elements.EnemyBat.prototype = Enemy.prototype;
  for (const method of ["getHitData", "_getHitData"]) {
    const original = Enemy.prototype[method];
    Enemy.prototype[method] = function(...args) {
      return enhance(original.apply(this, args), this.paddleType);
    };
  }
  window.PaddleTypes = { profiles, valid, select, get selected() { return selected; } };
})();
