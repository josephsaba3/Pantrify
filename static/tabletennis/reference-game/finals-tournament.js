// Pure tournament state. Matches involving the player use the game's real score.
(() => {
  "use strict";
  const ROUND_NAMES = ["Round of 32", "Round of 16", "Quarterfinals", "Semifinals", "Final"];
  const clone = value => JSON.parse(JSON.stringify(value));
  function shuffle(values, random) {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function validScore(score) {
    return Array.isArray(score) && score.length === 2
      && score.every(n => Number.isInteger(n) && n >= 0 && n <= 99)
      && score[0] !== score[1] && Math.max(...score) >= 11
      && (Math.abs(score[0] - score[1]) >= 2 || Math.max(...score) === 99);
  }
  function create(playerId, eligible, random = Math.random, difficulty = "medium") {
    if (!["easy", "medium", "challenging", "hard"].includes(difficulty)) throw new Error("Choose Easy, Medium, Challenging, or Hard.");
    const pool = [...new Set(eligible)].filter(Number.isInteger);
    if (pool.length < 32 || !pool.includes(playerId)) throw new Error("Finals need 32 available countries, including the player.");
    const entrants = shuffle([playerId, ...shuffle(pool.filter(id => id !== playerId), random).slice(0, 31)], random);
    const rounds = ROUND_NAMES.map((_, round) => Array.from({ length: 16 >> round }, (_, index) => ({
      home: round === 0 ? entrants[index * 2] : null,
      away: round === 0 ? entrants[index * 2 + 1] : null,
      score: null, winner: null
    })));
    return { version: 1, id: `${Date.now().toString(36)}-${Math.floor(random() * 0x100000000).toString(36)}`,
      playerId, difficulty, entrants, rounds, round: 0, status: "active", champion: null, eliminatedRound: null };
  }
  function nextMatch(state) {
    if (state.status !== "active") return null;
    const index = state.rounds[state.round].findIndex(m => m.winner === null && (m.home === state.playerId || m.away === state.playerId));
    if (index < 0) return null;
    const match = state.rounds[state.round][index];
    return { ...match, round: state.round, index, opponentId: match.home === state.playerId ? match.away : match.home,
      token: `${state.id}:${state.round}:${index}` };
  }
  function simulate(match, random) {
    const loser = Math.floor(random() * 12);
    const winner = Math.max(11, loser + 2);
    const homeWins = random() < 0.5;
    match.score = homeWins ? [winner, loser] : [loser, winner];
    match.winner = homeWins ? match.home : match.away;
  }
  function advance(state, round) {
    if (round === 4) {
      state.champion = state.rounds[4][0].winner;
      return;
    }
    state.rounds[round + 1].forEach((match, index) => {
      match.home = state.rounds[round][index * 2].winner;
      match.away = state.rounds[round][index * 2 + 1].winner;
    });
  }
  function record(state, token, playerScore, opponentScore, random = Math.random) {
    const pending = nextMatch(state);
    if (!pending || pending.token !== token) throw new Error("This finals match has already finished or is no longer current.");
    if (!validScore([playerScore, opponentScore])) throw new Error("A completed match needs a valid first-to-11 score.");
    const result = clone(state);
    const match = result.rounds[pending.round][pending.index];
    match.score = match.home === result.playerId ? [playerScore, opponentScore] : [opponentScore, playerScore];
    match.winner = playerScore > opponentScore ? result.playerId : pending.opponentId;
    for (const other of result.rounds[result.round]) if (other.winner === null) simulate(other, random);
    advance(result, result.round);
    if (playerScore < opponentScore) {
      result.status = "eliminated";
      result.eliminatedRound = result.round;
      // Complete the rest of the draw so all results and its champion are visible.
      for (let round = result.round + 1; round < 5; round++) {
        result.rounds[round].forEach(other => simulate(other, random));
        advance(result, round);
      }
    } else if (result.round === 4) result.status = "champion";
    else result.round++;
    return result;
  }
  function restore(serialized, eligible) {
    try {
      const data = typeof serialized === "string" ? JSON.parse(serialized) : clone(serialized);
      if (!data || data.version !== 1 || typeof data.id !== "string" || !/^[a-z0-9-]{1,80}$/.test(data.id)) return null;
      // Saves made before difficulty selection used the opening-match opponent.
      if (data.difficulty === undefined) data.difficulty = "easy";
      if (!["easy", "medium", "challenging", "hard"].includes(data.difficulty)) return null;
      if (!Array.isArray(data.entrants) || data.entrants.length !== 32 || new Set(data.entrants).size !== 32) return null;
      if (!data.entrants.every(id => Number.isInteger(id) && eligible.includes(id)) || !data.entrants.includes(data.playerId)) return null;
      if (!Number.isInteger(data.round) || data.round < 0 || data.round > 4 || !["active", "champion", "eliminated"].includes(data.status)) return null;
      if (!Array.isArray(data.rounds) || data.rounds.length !== 5) return null;
      for (let round = 0; round < 5; round++) {
        if (!Array.isArray(data.rounds[round]) || data.rounds[round].length !== (16 >> round)) return null;
        for (let index = 0; index < data.rounds[round].length; index++) {
          const match = data.rounds[round][index];
          if (!match || match.home !== (round === 0 ? data.entrants[index * 2] : data.rounds[round - 1][index * 2].winner)
            || match.away !== (round === 0 ? data.entrants[index * 2 + 1] : data.rounds[round - 1][index * 2 + 1].winner)) return null;
          const shouldBeComplete = data.status !== "active" || round < data.round;
          if (!shouldBeComplete) { if (match.winner !== null || match.score !== null) return null; }
          else if (match.home === null || match.away === null || !validScore(match.score)
            || match.winner !== (match.score[0] > match.score[1] ? match.home : match.away)) return null;
        }
      }
      if (data.status === "active") {
        if (data.champion !== null || data.eliminatedRound !== null || !nextMatch(data)) return null;
      } else {
        if (data.champion !== data.rounds[4][0].winner) return null;
        for (let round = 0; round <= data.round; round++) {
          const match = data.rounds[round].find(m => m.home === data.playerId || m.away === data.playerId);
          if (!match || (round < data.round && match.winner !== data.playerId)) return null;
          if (round === data.round && (match.winner === data.playerId) !== (data.status === "champion")) return null;
        }
        if (data.status === "champion" && (data.round !== 4 || data.champion !== data.playerId || data.eliminatedRound !== null)) return null;
        if (data.status === "eliminated" && data.eliminatedRound !== data.round) return null;
      }
      return data;
    } catch { return null; }
  }
  window.FinalsTournament = { ROUND_NAMES, create, nextMatch, record, restore };
})();
