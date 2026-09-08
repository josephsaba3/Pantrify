// Opponent-only difficulty. The supplied ball physics and player paddle stay intact.
(() => {
  "use strict";
  const profiles = Object.freeze({
    easy: Object.freeze({ label: "Easy", description: "More time to react, gentler returns, and a forgiving opponent.",
      skill: 0.14, reaction: 0.28, reactionVariation: 0.10, travel: 0.78, tracking: 0.8, movement: 340, recovery: 0.8,
      spread: 0.52, accuracyError: 0.26, pressureError: 0.30, placement: 0.10, paceCap: 0.41, spin: 0.23, spinChance: 0.22 }),
    medium: Object.freeze({ label: "Medium", description: "Quicker rallies, varied spin, and more accurate placement.",
      skill: 0.52, reaction: 0.14, reactionVariation: 0.08, travel: 1, tracking: 1.1, movement: 520, recovery: 1,
      spread: 0.66, accuracyError: 0.16, pressureError: 0.22, placement: 0.48, paceCap: 0.49, spin: 0.52, spinChance: 0.52 }),
    challenging: Object.freeze({ label: "Challenging", description: "Sharper reactions and stronger spin, with room to recover.",
      skill: 0.71, reaction: 0.10, reactionVariation: 0.07, travel: 1.16, tracking: 1.275, movement: 620, recovery: 1.125,
      spread: 0.74, accuracyError: 0.125, pressureError: 0.185, placement: 0.65, paceCap: 0.525, spin: 0.68, spinChance: 0.66 }),
    hard: Object.freeze({ label: "Hard", description: "Fast reactions, stronger spin, and returns into open space.",
      skill: 0.90, reaction: 0.06, reactionVariation: 0.06, travel: 1.32, tracking: 1.45, movement: 720, recovery: 1.25,
      spread: 0.82, accuracyError: 0.09, pressureError: 0.15, placement: 0.82, paceCap: 0.56, spin: 0.84, spinChance: 0.80 })
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
    const before = this.x, tracking = this.trackBall, tween = this.moveTween;
    original.update.call(this);
    if (tracking && this.trackBall) this.x = before + (this.x - before) * this.profile.tracking;
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
    const targetY = serving ? 0.65 + Math.random() * 0.20 : 0.66 + Math.random() * 0.33;
    const pace = clamp(0.3 + 0.75 * (targetY - 0.6) * (0.25 + 0.75 * profile.skill), 0.3, profile.paceCap);
    const spin = Math.random() < profile.spinChance
      ? -Math.sign(targetX) * Math.random() * profile.spin * (1 - pressure * 0.25) : 0;
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
