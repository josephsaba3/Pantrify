// Five comeback stages. Losses keep the current stage available to retry.
(() => {
  "use strict";
  const START_SCORES = Object.freeze([6, 7, 8, 9, 10]);
  const clone = value => JSON.parse(JSON.stringify(value));
  function validScore(player, cpu, stage) {
    if (![player, cpu].every(n => Number.isInteger(n) && n >= 0 && n <= 99) || cpu < START_SCORES[stage]) return false;
    const high = Math.max(player, cpu), low = Math.min(player, cpu);
    return (high === 11 && low <= 9) || (high >= 12 && high - low === 2) || (high === 99 && low === 98);
  }
  function create(playerId, eligible, difficulty, random = Math.random) {
    const opponents = [...new Set(eligible)].filter(id => Number.isInteger(id) && id !== playerId);
    if (!Number.isInteger(playerId) || !eligible.includes(playerId) || !opponents.length || !["easy", "medium", "challenging", "hard"].includes(difficulty)) throw new Error("Choose a country and difficulty.");
    return { version: 1, id: `${Date.now().toString(36)}-${Math.floor(random() * 0x100000000).toString(36)}`,
      playerId, opponentId: opponents[Math.floor(random() * opponents.length)], difficulty,
      stage: 0, status: "active", wins: [], attempts: 0, lastResult: null };
  }
  function nextMatch(state) {
    if (state.status !== "active") return null;
    return { stage: state.stage, startingScore: START_SCORES[state.stage], opponentId: state.opponentId,
      token: `${state.id}:${state.stage}:${state.attempts}` };
  }
  function record(state, token, playerScore, cpuScore) {
    const next = nextMatch(state);
    if (!next || next.token !== token) throw new Error("This handicap result is no longer current.");
    if (!validScore(playerScore, cpuScore, state.stage)) throw new Error("The match needs a completed score with the CPU's head start.");
    const result = clone(state);
    const won = playerScore > cpuScore;
    result.attempts++;
    result.lastResult = { stage: state.stage, playerScore, cpuScore, won };
    if (won) {
      result.wins.push({ stage: state.stage, playerScore, cpuScore });
      if (state.stage === 4) result.status = "complete";
      else result.stage++;
    }
    return result;
  }
  function restore(serialized, eligible) {
    try {
      const state = typeof serialized === "string" ? JSON.parse(serialized) : clone(serialized);
      if (!state || state.version !== 1 || typeof state.id !== "string" || !/^[a-z0-9-]{1,80}$/.test(state.id)) return null;
      if (![state.playerId, state.opponentId].every(id => Number.isInteger(id) && eligible.includes(id)) || state.playerId === state.opponentId) return null;
      if (!["easy", "medium", "challenging", "hard"].includes(state.difficulty) || !["active", "complete"].includes(state.status)) return null;
      if (!Number.isInteger(state.stage) || state.stage < 0 || state.stage > 4 || (state.status === "complete" && state.stage !== 4)) return null;
      if (!Array.isArray(state.wins) || state.wins.length !== (state.status === "complete" ? 5 : state.stage)) return null;
      if (!state.wins.every((win, stage) => win && win.stage === stage && validScore(win.playerScore, win.cpuScore, stage) && win.playerScore > win.cpuScore)) return null;
      if (!Number.isSafeInteger(state.attempts) || state.attempts < state.wins.length || state.attempts < 0) return null;
      const last = state.lastResult;
      if (state.attempts === 0) return state.stage === 0 && last === null ? state : null;
      if (!last || !Number.isInteger(last.stage) || last.stage < 0 || last.stage > 4 || !validScore(last.playerScore, last.cpuScore, last.stage)) return null;
      if (last.won !== (last.playerScore > last.cpuScore)) return null;
      if (last.won) {
        const win = state.wins[state.wins.length - 1];
        if (!win || win.stage !== last.stage || win.playerScore !== last.playerScore || win.cpuScore !== last.cpuScore) return null;
      } else if (state.status !== "active" || last.stage !== state.stage || state.attempts <= state.wins.length) return null;
      return state;
    } catch { return null; }
  }
  window.HandicapChallenge = { START_SCORES, create, nextMatch, record, restore };
})();
