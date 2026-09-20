// Opponent-only difficulty. The supplied ball physics and player paddle stay intact.
(() => {
  "use strict";
  const profiles = Object.freeze({
    easy: Object.freeze({ label: "Easy", description: "More time to react, gentler returns, and a forgiving opponent.",
      skill: 0.36, reaction: 0.20, reactionVariation: 0.08, travel: 0.94, tracking: 1.0, movement: 460, recovery: 0.94,
      spread: 0.60, accuracyError: 0.22, pressureError: 0.26, placement: 0.30, paceCap: 0.46, spin: 0.36, spinChance: 0.36,
      readjustAt: 0.10, mishitChance: 0.065, pressureMishit: 0.08 }),
    medium: Object.freeze({ label: "Medium", description: "Quicker rallies, varied spin, and more accurate placement.",
      skill: 0.70, reaction: 0.105, reactionVariation: 0.065, travel: 1.17, tracking: 1.28, movement: 650, recovery: 1.14,
      spread: 0.74, accuracyError: 0.125, pressureError: 0.18, placement: 0.65, paceCap: 0.53, spin: 0.65, spinChance: 0.64,
      readjustAt: 0.20, mishitChance: 0.043, pressureMishit: 0.06 }),
    challenging: Object.freeze({ label: "Challenging", description: "Sharper reactions and stronger spin, with room to recover.",
      skill: 0.91, reaction: 0.055, reactionVariation: 0.045, travel: 1.40, tracking: 1.54, movement: 780, recovery: 1.34,
      spread: 0.85, accuracyError: 0.08, pressureError: 0.13, placement: 0.84, paceCap: 0.575, spin: 0.86, spinChance: 0.80,
      readjustAt: 0.28, mishitChance: 0.030, pressureMishit: 0.045 }),
    hard: Object.freeze({ label: "Hard", description: "Fast reactions, stronger spin, and returns into open space.",
      skill: 0.99, reaction: 0.025, reactionVariation: 0.035, travel: 1.48, tracking: 1.65, movement: 840, recovery: 1.42,
      spread: 0.89, accuracyError: 0.065, pressureError: 0.11, placement: 0.90, paceCap: 0.59, spin: 0.94, spinChance: 0.86,
      readjustAt: 0.32, mishitChance: 0.024, pressureMishit: 0.035 })
  });
  const valid = id => Object.hasOwn(profiles, id);
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  let selected = window.famobi.localStorage.getItem("difficulty:v1");
  if (!valid(selected)) selected = "medium";
  function select(id) {
    if (!valid(id)) return false;
    selected = id;
    window.famobi.localStorage.setItem("difficulty:v1", id);
    return true;
  }

  const Enemy = Elements.EnemyBat;
  const original = { bounce: Enemy.prototype.setBouncePos, update: Enemy.prototype.update,
    centre: Enemy.prototype.resetToCentre };
  // Capture the selected level once per match, independently of World tour IDs.
  Elements.EnemyBat = function() {
    const opponent = new Enemy();
    opponent.difficulty = selected;
    opponent.profile = profiles[selected];
    opponent.skillLevel = opponent.profile.skill;
    opponent.pendingReaction = null;
    opponent.shotCache = null;
    return opponent;
  };
  Elements.EnemyBat.prototype = Enemy.prototype;
  function tuneTween(opponent, rate, removeDelay = false) {
    if (!opponent.moveTween) return;
    if (removeDelay) opponent.moveTween.delay(0);
    opponent.moveTween.timeScale(rate);
  }
  Enemy.prototype.resetToCentre = function() {
    this.pendingReaction = null;
    this.shotCache = null;
    original.centre.call(this);
    tuneTween(this, this.profile.recovery);
  };
  Enemy.prototype.setBouncePos = function(x, y, spin) {
    this.moveTween?.kill();
    this.trackBall = false;
    this.targX = this.x - canvas.width / 2;
    this.shotCache = null;
    // Countdown uses game time so pausing cannot consume the opponent's delay.
    this.pendingReaction = { x, y, spin, remaining: this.profile.reaction + Math.random() * this.profile.reactionVariation };
  };
  Enemy.prototype.update = function() {
    if (window.famobi.paused) return;
    const dt = Math.max(0, delta);
    if (this.pendingReaction) {
      this.pendingReaction.remaining -= dt;
      if (this.pendingReaction.remaining <= 0) {
        const pending = this.pendingReaction;
        this.pendingReaction = null;
        if (ball.lastHit === "user") {
          original.bounce.call(this, pending.x, pending.y, pending.spin);
          tuneTween(this, this.profile.travel, true);
        }
      }
    }
    // Correct the initial forecast from the visible bounce. Stronger opponents
    // start this adjustment earlier, which helps them read curved returns.
    if (!this.pendingReaction && !this.trackBall && ball.lastHit === "user" &&
      ball.servingState > 0 && ball.bounceNum >= (ball.servingState === 1 ? 2 : 1) &&
      ball.tablePosY > 0 && ball.tablePosY <= this.profile.readjustAt && !ball.offTable && !ball.offSide) {
      this.moveTween?.kill();
      this.trackBall = true;
      this.slideInc = 0;
    }
    const before = this.x, tracking = this.trackBall, tween = this.moveTween;
    if (tracking && Math.abs(ball.x - before) <= 15) this.slideInc = 0;
    original.update.call(this);
    if (tracking && this.trackBall) {
      const step = (this.x - before) * this.profile.tracking;
      const gap = ball.x - before;
      // Faster pursuit should reach the ball, not oscillate past it.
      if (step * gap > 0 && Math.abs(step) >= Math.abs(gap)) {
        this.x = ball.x;
        this.slideInc = 0;
      } else this.x = before + step;
    }
    const maxStep = this.profile.movement * dt;
    this.x = clamp(this.x, before - maxStep, before + maxStep);
    this.x = clamp(this.x, canvas.width / 2 - 250, canvas.width / 2 + 250);
    this.rotation = (this.x - canvas.width / 2) / 200;
    if (this.moveTween !== tween) tuneTween(this, this.profile.recovery);
  };

  function shot(opponent, x, y) {
    const profile = opponent.profile;
    const serving = ball.servingState === 0;
    const cache = opponent.shotCache;
    // The source asks twice for one contact: once to hit, once for analytics.
    if (cache && cache.ball === ball && cache.rally === rallyHits && cache.serving === serving) return { ...cache.value };
    const reach = 70 * opponent.scale;
    const pressure = serving ? 0 : clamp(Math.abs(ball.x - opponent.x) / Math.max(1, reach), 0, 1);
    const playerSide = clamp((userBat.x - canvas.width / 2) / 300, -1, 1);
    let targetX = (Math.random() * 2 - 1) * profile.spread;
    if (!serving && Math.abs(playerSide) > 0.12 && Math.random() < profile.placement) {
      targetX = -Math.sign(playerSide) * (0.42 + Math.random() * profile.spread * 0.45);
    }
    targetX += (Math.random() * 2 - 1) * (profile.accuracyError + pressure * pressure * profile.pressureError);
    // A stretched return can drift wide; contact still depends on the original hitbox.
    targetX = clamp(targetX, -1.12, 1.12);
    let targetY = serving ? 0.65 + Math.random() * 0.20 : 0.66 + Math.random() * 0.33;
    const pace = clamp(0.3 + 0.75 * (targetY - 0.6) * (0.25 + 0.75 * profile.skill), 0.3, profile.paceCap);
    let spin = Math.random() < profile.spinChance
      ? -Math.sign(targetX) * Math.random() * profile.spin * (1 - pressure * 0.25) : 0;
    // Occasional execution errors, especially at the edge of the paddle. Let
    // the real ball flight and scoring decide the outcome, just like any shot.
    // Serves use their own two-bounce trajectory and are kept out of this roll.
    if (!serving && Math.random() < profile.mishitChance + pressure * pressure * profile.pressureMishit) {
      if (Math.random() < 0.5) targetY = 1.12 + Math.random() * 0.12;
      else targetX = (Math.sign(targetX) || 1) * (1.45 + Math.random() * 0.15);
      spin = 0;
    }
    const value = { x: targetX, y: targetY, speed: pace, spin };
    opponent.hitX = targetX;
    opponent.hitY = targetY;
    opponent.shotCache = { ball, rally: rallyHits, serving, value };
    return { ...value };
  }
  Enemy.prototype.getHitData = function(x, y) { return shot(this, x, y); };
  Enemy.prototype._getHitData = function(x, y) { return shot(this, x, y); };
  window.MatchDifficulty = { profiles, valid, select, get selected() { return selected; } };
})();
