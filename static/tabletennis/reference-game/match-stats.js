// Match bookkeeping hooks; the supplied ball and scoring rules stay unchanged.
(() => {
  "use strict";
  const KEY = "player-stats:v1";
  const fields = ["pointsWon", "servePointsWon", "returnPointsWon", "unforcedErrors", "matchPointsSaved"];
  const side = () => Object.fromEntries(fields.map(key => [key, 0]));
  const empty = () => ({ version: 1, matches: 0, wins: 0, losses: 0, player: side(), opponent: side(), longestRally: 0 });
  const clone = value => JSON.parse(JSON.stringify(value));
  const integer = value => Number.isSafeInteger(value) && value >= 0;
  function restore(raw) {
    try {
      const data = JSON.parse(raw);
      if (data?.version !== 1 || ![data.matches, data.wins, data.losses, data.longestRally].every(integer) || data.wins + data.losses !== data.matches) return empty();
      for (const team of [data.player, data.opponent]) {
        if (!team || !fields.every(key => integer(team[key])) || team.servePointsWon + team.returnPointsWon !== team.pointsWon) return empty();
      }
      return data;
    } catch { return empty(); }
  }
  const wins = (a, b) => (a >= 11 && a - b >= 2) || a === 99;
  function matchPoints(player, opponent) {
    if (wins(player, opponent) || wins(opponent, player)) return { user: 0, enemy: 0 };
    const count = (a, b) => wins(a + 1, b) ? Math.max(1, a - b) : 0;
    return { user: count(player, opponent), enemy: count(opponent, player) };
  }
  function errorSide(ball, winner) {
    const loser = winner === "user" ? "enemy" : "user";
    // A missed return is not a shot error. A short shot can bounce on the
    // hitter's own side before hitting the net, so bounceNum alone is insufficient.
    return ball?.statsLastShot === loser && ball.lastHit === loser &&
      (ball.ballShortState > 0 || ball.bounceNum === 0) ? loser : null;
  }
  let current = null;
  let completed = null;
  let bannerTimer = 0;
  let bannerKey = "";
  const banner = document.createElement("div");
  banner.id = "match-point-label";
  banner.hidden = true;
  banner.setAttribute("role", "status");
  banner.setAttribute("aria-live", "polite");
  banner.setAttribute("aria-atomic", "true");
  document.getElementById("canvas-wrapper").appendChild(banner);
  function clearBanner() {
    clearTimeout(bannerTimer);
    banner.hidden = true;
    banner.textContent = "";
    bannerKey = "";
  }
  function announce() {
    if (!current || gameState !== "game" || firstRun) return clearBanner();
    const points = matchPoints(oGameData.userScore, oGameData.enemyScore);
    const owner = points.user ? "user" : points.enemy ? "enemy" : null;
    if (!owner) return clearBanner();
    const key = `${owner}:${points[owner]}`;
    if (key === bannerKey) return;
    clearBanner();
    bannerKey = key;
    banner.textContent = `${owner === "user" ? "You" : "Opponent"}: ${points[owner]} match point${points[owner] === 1 ? "" : "s"}`;
    banner.hidden = false;
    bannerTimer = setTimeout(() => { banner.hidden = true; banner.textContent = ""; }, 4000);
  }
  function abandon() { current = null; clearBanner(); }
  function begin() {
    clearBanner();
    completed = null;
    current = { player: side(), opponent: side(), longestRally: 0,
      playerId: oGameData.userId, opponentId: oGameData.enemyId,
      mode: window.TableTennisModes?.mode ?? "world", difficulty: window.MatchDifficulty.selected,
      startingScore: [oGameData.userScore, oGameData.enemyScore] };
    announce();
  }
  function recordPoint(winner) {
    if (!current) return;
    const key = winner === "user" ? "player" : "opponent";
    const other = winner === "user" ? "enemy" : "user";
    const team = current[key];
    team.pointsWon++;
    team[ball.statsServer === winner ? "servePointsWon" : "returnPointsWon"]++;
    if (matchPoints(oGameData.userScore, oGameData.enemyScore)[other]) team.matchPointsSaved++;
    const error = errorSide(ball, winner);
    if (error) current[error === "user" ? "player" : "opponent"].unforcedErrors++;
    current.longestRally = Math.max(current.longestRally, Math.max(0, window.rallyHits || 0));
  }
  function finish() {
    if (!current || !(wins(oGameData.userScore, oGameData.enemyScore) || wins(oGameData.enemyScore, oGameData.userScore))) return null;
    completed = { ...current, score: [oGameData.userScore, oGameData.enemyScore], won: oGameData.userScore > oGameData.enemyScore };
    const totals = restore(window.famobi.localStorage.getItem(KEY));
    totals.matches++;
    totals[completed.won ? "wins" : "losses"]++;
    for (const team of ["player", "opponent"]) for (const field of fields) totals[team][field] += completed[team][field];
    totals.longestRally = Math.max(totals.longestRally, completed.longestRally);
    window.famobi.localStorage.setItem(KEY, JSON.stringify(totals));
    abandon();
    return clone(completed);
  }
  const originalStart = window._initGame;
  window._initGame = function(...args) {
    abandon();
    const result = originalStart.apply(this, args);
    begin();
    return result;
  };
  const originalServe = Elements.Ball.prototype.resetServe;
  Elements.Ball.prototype.resetServe = function(server) {
    this.statsServer = server;
    this.statsLastShot = null;
    return originalServe.call(this, server);
  };
  const originalShot = Elements.Ball.prototype.setBouncePoint;
  Elements.Ball.prototype.setBouncePoint = function(...args) {
    this.statsLastShot = this.lastHit;
    return originalShot.apply(this, args);
  };
  const originalScore = window.updateScore;
  window.updateScore = function(winner, ...args) {
    if (gameState !== "game" || !current || !["user", "enemy"].includes(winner)) return;
    recordPoint(winner); // Capture ball and pre-point score before the source resets them.
    const result = originalScore.call(this, winner, ...args);
    announce();
    return result;
  };
  const originalPause = window.initPause;
  window.initPause = function(...args) { clearBanner(); return originalPause.apply(this, args); };
  window.MatchStats = { matchPoints, errorSide, restore, finish, abandon, clearBanner, announce,
    get current() { return current ? clone(current) : null; },
    get completed() { return completed ? clone(completed) : null; },
    get totals() { return clone(restore(window.famobi.localStorage.getItem(KEY))); }
  };
})();
