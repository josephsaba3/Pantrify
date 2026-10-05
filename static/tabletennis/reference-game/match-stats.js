// Match bookkeeping hooks; the supplied ball and scoring rules stay unchanged.
(() => {
  "use strict";
  const KEY = "player-stats:v1";
  const fields = ["pointsWon", "aces", "servePointsWon", "returnPointsWon", "unforcedErrors", "matchPointsSaved"];
  // Streaks are a per-match maximum, so they are kept beside the summed fields.
  const side = () => ({ ...Object.fromEntries(fields.map(key => [key, 0])), longestStreak: 0 });
  // All-time teams also hold match streaks; the open runs let streaks continue into the next match.
  const totalSide = () => ({ ...side(), longestMatchStreak: 0 });
  const noRun = () => ({ side: null, length: 0 });
  const empty = () => ({ version: 1, matches: 0, wins: 0, losses: 0, player: totalSide(), opponent: totalSide(), longestRally: 0, totalRallyHits: 0, ralliesTracked: 0, pointRun: noRun(), matchRun: noRun() });
  const clone = value => JSON.parse(JSON.stringify(value));
  const integer = value => Number.isSafeInteger(value) && value >= 0;
  function restore(raw) {
    try {
      const data = JSON.parse(raw);
      if (data?.version !== 1 || ![data.matches, data.wins, data.losses, data.longestRally].every(integer) || data.wins + data.losses !== data.matches) return empty();
      for (const team of [data.player, data.opponent]) {
        // Keep existing match history; aces cannot be reconstructed from old totals.
        if (team && team.aces === undefined) team.aces = 0;
        if (team && team.longestStreak === undefined) team.longestStreak = 0;
        if (team && team.longestMatchStreak === undefined) team.longestMatchStreak = 0;
        if (!team || !fields.every(key => integer(team[key])) || team.servePointsWon + team.returnPointsWon !== team.pointsWon) return empty();
        if (team.aces > team.servePointsWon) return empty();
        if (!integer(team.longestStreak) || team.longestStreak > team.pointsWon || !integer(team.longestMatchStreak)) return empty();
      }
      // Earlier stats records did not retain rally totals. Preserve those
      // matches, and average only the points whose rally length is known.
      if (data.totalRallyHits === undefined && data.ralliesTracked === undefined) {
        data.totalRallyHits = 0;
        data.ralliesTracked = 0;
      }
      if (data.player.longestMatchStreak > data.wins || data.opponent.longestMatchStreak > data.losses) return empty();
      // Saves from before cross-match streaks start with no open run.
      data.pointRun ??= noRun();
      data.matchRun ??= noRun();
      const validRun = (run, best) => run?.side === null ? run.length === 0
        : ["player", "opponent"].includes(run?.side) && integer(run.length) && run.length >= 1 && run.length <= data[run.side][best];
      if (!validRun(data.pointRun, "longestStreak") || !validRun(data.matchRun, "longestMatchStreak")) return empty();
      if (![data.totalRallyHits, data.ralliesTracked].every(integer) ||
        data.ralliesTracked > data.player.pointsWon + data.opponent.pointsWon ||
        (data.ralliesTracked === 0 && data.totalRallyHits !== 0)) return empty();
      return data;
    } catch { return empty(); }
  }
  const wins = (a, b) => (a >= 11 && a - b >= 2) || a === 99;
  // Endurance runs end on the first lost point, or at the source's 99-point cap.
  const endurance = () => current?.mode === "endurance";
  const enduranceOver = (player, opponent) => opponent >= 1 || player === 99;
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
    if (!current || endurance() || gameState !== "game" || firstRun || window.ball?.servingState > 0) return clearBanner();
    const points = matchPoints(oGameData.userScore, oGameData.enemyScore);
    const owner = points.user ? "user" : points.enemy ? "enemy" : null;
    if (!owner) return clearBanner();
    const both = points.user > 0 && points.enemy > 0;
    const key = `${both ? "both" : owner}:${points[owner]}`;
    if (key === bannerKey) return;
    clearBanner();
    bannerKey = key;
    banner.textContent = `${both ? "Both players" : owner === "user" ? "You" : "Opponent"}: ${points[owner]} match point${points[owner] === 1 ? "" : "s"}`;
    banner.hidden = false;
    bannerTimer = setTimeout(() => { banner.hidden = true; banner.textContent = ""; }, 4000);
  }
  function abandon() { current = null; clearBanner(); }
  function begin() {
    clearBanner();
    completed = null;
    current = { player: side(), opponent: side(), longestRally: 0, totalRallyHits: 0, ralliesTracked: 0, streakSide: null, streakLength: 0, openingSide: null, openingLength: 0, openingOpen: true,
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
    if (!endurance() && matchPoints(oGameData.userScore, oGameData.enemyScore)[other]) team.matchPointsSaved++;
    const error = errorSide(ball, winner);
    if (error) current[error === "user" ? "player" : "opponent"].unforcedErrors++;
    // The opening run can join the previous match's closing run in the all-time totals.
    if (current.streakSide === null) current.openingSide = key;
    else if (current.streakSide !== key) current.openingOpen = false;
    current.streakLength = current.streakSide === key ? current.streakLength + 1 : 1;
    current.streakSide = key;
    if (current.openingOpen) current.openingLength = current.streakLength;
    team.longestStreak = Math.max(team.longestStreak, current.streakLength);
    const hits = Math.max(0, window.rallyHits || 0);
    // A legal serve bounces on both halves before the receiver can touch it.
    // A return (even one hit out) ends the ace opportunity.
    if (ball.statsServer === winner && ball.statsLastShot === winner && ball.lastHit === winner &&
      ball.servingState === 1 && ball.bounceNum >= 2 && ball.ballShortState === 0 && hits === 0) team.aces++;
    current.longestRally = Math.max(current.longestRally, hits);
    current.totalRallyHits += hits;
    current.ralliesTracked++;
  }
  function finish() {
    if (!current) return null;
    if (endurance()) {
      if (!enduranceOver(oGameData.userScore, oGameData.enemyScore)) return null;
      // Runs are kept out of the all-time record, so they never extend or break its streaks.
      completed = { ...current, score: [oGameData.userScore, oGameData.enemyScore], won: oGameData.enemyScore === 0 };
      abandon();
      return clone(completed);
    }
    if (!(wins(oGameData.userScore, oGameData.enemyScore) || wins(oGameData.enemyScore, oGameData.userScore))) return null;
    completed = { ...current, score: [oGameData.userScore, oGameData.enemyScore], won: oGameData.userScore > oGameData.enemyScore };
    const totals = restore(window.famobi.localStorage.getItem(KEY));
    totals.matches++;
    totals[completed.won ? "wins" : "losses"]++;
    for (const team of ["player", "opponent"]) {
      for (const field of fields) totals[team][field] += completed[team][field];
      totals[team].longestStreak = Math.max(totals[team].longestStreak, completed[team].longestStreak);
    }
    const run = totals.pointRun;
    const joins = run.side !== null && run.side === completed.openingSide;
    if (joins) totals[run.side].longestStreak = Math.max(totals[run.side].longestStreak, run.length + completed.openingLength);
    if (completed.streakSide) {
      // An unbroken match extends the open run rather than replacing it.
      const unbroken = completed.openingOpen && joins;
      totals.pointRun = { side: completed.streakSide, length: completed.streakLength + (unbroken ? run.length : 0) };
    }
    const winner = completed.won ? "player" : "opponent";
    totals.matchRun = { side: winner, length: totals.matchRun.side === winner ? totals.matchRun.length + 1 : 1 };
    totals[winner].longestMatchStreak = Math.max(totals[winner].longestMatchStreak, totals.matchRun.length);
    totals.longestRally = Math.max(totals.longestRally, completed.longestRally);
    totals.totalRallyHits += completed.totalRallyHits;
    totals.ralliesTracked += completed.ralliesTracked;
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
    const result = originalServe.call(this, server);
    // Scoring runs before the source resets the ball. Announce only once it
    // reaches this between-points state, never over the previous live ball.
    if (this === window.ball) announce();
    return result;
  };
  const originalShot = Elements.Ball.prototype.setBouncePoint;
  Elements.Ball.prototype.setBouncePoint = function(...args) {
    if (this === window.ball) clearBanner();
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
