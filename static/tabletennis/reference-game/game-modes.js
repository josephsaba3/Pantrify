// Extend the copied game's menus and competition flow; its match engine stays intact.
(() => {
  "use strict";
  const tournament = window.FinalsTournament;
  const difficulty = window.MatchDifficulty;
  const handicap = window.HandicapChallenge;
  const modeNames = { world: "World mode", finals: "Finals system", handicap: "CPU Handicap" };
  const original = { button: window.butEventHandler, start: window.initStartScreen, complete: window.initGameComplete, frame: window.requestAnimFrame };
  const screenFrames = new Set();
  window.requestAnimFrame = function(callback) {
    // The source can finish a match inside Ball.update, then queue one more
    // game frame. Do not let it follow the player into the next round.
    if (callback === window.updateGameEvent && gameState !== "game") return 0;
    const id = original.frame.call(window, time => { screenFrames.delete(id); callback(time); });
    screenFrames.add(id);
    return id;
  };
  const flow = document.getElementById("mode-flow");
  const court = document.getElementById("canvas-wrapper");
  const countryNames = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
  const names = { GB: "United Kingdom", KR: "South Korea", HK: "Hong Kong", TW: "Taiwan" };
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  let mode = null, state = null, activeMatch = null, lastResult = null;
  let handicapState = null;
  const platformProperties = window.famobi.getFeatureProperties.bind(window.famobi);
  window.famobi.getFeatureProperties = function(name) {
    const properties = platformProperties(name);
    if (name === "forced_mode" && mode === "handicap" && activeMatch) {
      // The source reads these scores before constructing its panel and ball.
      // This also applies the same head start when restarting a paused match.
      return { ...properties, state: { ...properties.state, user_score: 0, enemy_score: activeMatch.startingScore } };
    }
    return properties;
  };
  const storageKey = (id, level = difficulty.selected) => `finals32:v1:${id}:${level}`;
  const handicapKey = (id, level) => `handicap:v1:${id}:${level}`;
  const eligible = () => [...countryFlags.aIds];
  function countryName(id) {
    const code = countryFlags.aAllCountryCodes[id];
    return names[code] ?? countryNames?.of(code) ?? code;
  }
  function imageCrop(file, box, width, height, className) {
    return `<svg class="${className}" viewBox="${box.x} ${box.y} ${box.width} ${box.height}" aria-hidden="true" focusable="false"><image href="images/${file}" width="${width}" height="${height}" /></svg>`;
  }
  function flag(id) {
    const b = countryFlags.getBData(id), image = assetLib.getData("countryFlags").img;
    return imageCrop("countryFlags.jpg", { x: b.bX, y: b.bY, width: b.bWidth, height: b.bHeight }, image.width, image.height, "country-flag");
  }
  function art(id, className = "mode-art") {
    const source = assetLib.getData("uiElements");
    return imageCrop("uiElements.png", source.oData.oAtlasData[oImageIds[id]], source.img.width, source.img.height, className);
  }
  function restoreWorld() {
    oGameData.cupId = saveDataHandler.getCurCupId();
    oGameData.gameId = saveDataHandler.getCurGameId();
  }
  function stopScreen() {
    for (const id of screenFrames) window.cancelAnimationFrame(id);
    screenFrames.clear();
    for (const actor of [window.ball, window.enemyBat, window.tableTop, window.panel, ...(window.panel?.aButs ?? [])]) {
      if (actor) TweenLite.killTweensOf(actor);
    }
    userInput.resetAll();
    userInput.aHitAreas.length = 0;
  }
  function show(html, screen) {
    stopScreen();
    gameState = screen;
    window.famobi.paused = true;
    court.hidden = true;
    flow.innerHTML = html;
    flow.hidden = false;
    flow.scrollTop = 0;
    flow.focus({ preventScroll: true });
  }
  function hide() {
    flow.hidden = true;
    court.hidden = false;
    window.famobi.paused = false;
    userInput.pauseIsOn = false;
  }
  function savedFinals(level = difficulty.selected) {
    let raw = window.famobi.localStorage.getItem(storageKey(oGameData.userId, level));
    // Preserve the old draw as Easy; leave its original storage entry intact.
    if (raw === null && level === "easy") raw = window.famobi.localStorage.getItem(`finals32:v1:${oGameData.userId}`);
    const saved = tournament.restore(raw, eligible());
    return saved?.playerId === oGameData.userId && saved.difficulty === level ? saved : null;
  }
  function persist() { window.famobi.localStorage.setItem(storageKey(state.playerId, state.difficulty), JSON.stringify(state)); }
  function newDraw() { return tournament.create(oGameData.userId, eligible(), Math.random, difficulty.selected); }
  function savedHandicap(level = difficulty.selected) {
    const saved = handicap.restore(window.famobi.localStorage.getItem(handicapKey(oGameData.userId, level)), eligible());
    return saved?.playerId === oGameData.userId && saved.difficulty === level ? saved : null;
  }
  function persistHandicap() { window.famobi.localStorage.setItem(handicapKey(handicapState.playerId, handicapState.difficulty), JSON.stringify(handicapState)); }
  function newHandicap() { return handicap.create(oGameData.userId, eligible(), difficulty.selected); }
  function handicapScore(cpu, preview = false) {
    return `<span class="handicap-score${preview ? " mode-art" : ""}"${preview ? ' aria-hidden="true"' : ` aria-label="Starting score: You 0, CPU ${cpu}"`}><span><small>YOU</small><b>0</b></span><span><small>CPU</small><b>${cpu}</b></span></span>`;
  }
  function chooseCountry() {
    activeMatch = null;
    mode = null;
    restoreWorld();
    stopScreen();
    hide();
    initChooseCountry();
  }
  function showModes() {
    activeMatch = null;
    mode = null;
    restoreWorld();
    state = savedFinals();
    const description = "32 countries. Five rounds. One champion.";
    show(`<div class="mode-page">
      <header class="mode-header"><h1>Choose game mode</h1><div class="chosen-country">${flag(oGameData.userId)}<strong>${escape(countryName(oGameData.userId))}</strong><button class="quiet-button" data-action="country">Change country</button></div></header>
      <div class="mode-options">
        <button class="mode-option" data-action="world">${art("map")}<span class="mode-description"><strong>World mode</strong><span>Travel the world and work your way through the tour.</span><span class="option-action">Choose difficulty</span></span></button>
        <button class="mode-option" data-action="finals">${art("cup0")}<span class="mode-description"><strong>Finals system</strong><span>${description}</span><span class="option-action">Choose difficulty</span></span></button>
        <button class="mode-option" data-action="handicap">${handicapScore(6, true)}<span class="mode-description"><strong>CPU Handicap</strong><span>Start 0–6 down. Each win gives the CPU one more starting point.</span><span class="option-action">Choose difficulty</span></span></button>
      </div>
      <button class="quiet-button mode-back" data-action="home">Back to title</button>
    </div>`, "modeSelect");
  }
  function chooseMode(next) {
    if (!Object.hasOwn(modeNames, next) || !eligible().includes(oGameData.userId)) return;
    mode = next;
    lastResult = null;
    showDifficulty();
  }
  function showDifficulty() {
    const choices = Object.entries(difficulty.profiles).map(([level, profile]) => {
      const saved = mode === "finals" ? savedFinals(level) : mode === "handicap" ? savedHandicap(level) : null;
      const action = saved?.status === "active" ? (mode === "handicap" ? `Play from 0–${handicap.START_SCORES[saved.stage]}` : `Continue ${tournament.ROUND_NAMES[saved.round].toLowerCase()}`)
        : saved ? "View results" : mode === "finals" ? "Start finals" : mode === "handicap" ? "Start at 0–6" : "Play world mode";
      return `<button class="difficulty-option" data-action="difficulty" data-level="${level}"><span class="difficulty-copy"><strong>${profile.label}</strong><span>${profile.description}</span></span><span class="difficulty-action">${action}</span></button>`;
    }).join("");
    show(`<div class="difficulty-page"><header class="mode-header"><h1>Choose difficulty</h1><div class="chosen-country">${flag(oGameData.userId)}<strong>${escape(countryName(oGameData.userId))}</strong><span>${modeNames[mode]}</span></div></header>
      <div class="difficulty-options">${choices}</div>
      ${mode !== "world" ? `<p class="difficulty-note">Each difficulty keeps its own ${mode === "finals" ? "finals" : "handicap"} progress.</p>` : ""}
      <button class="quiet-button mode-back" data-action="modes">Back to game modes</button></div>`, "difficultySelect");
  }
  function chooseDifficulty(level) {
    if (gameState !== "difficultySelect" || !Object.hasOwn(modeNames, mode) || !difficulty.select(level)) return;
    if (mode === "world") {
      restoreWorld();
      stopScreen();
      hide();
      initMapScreen();
    } else if (mode === "finals") {
      state = savedFinals() ?? newDraw();
      persist();
      showBracket();
    } else {
      handicapState = savedHandicap() ?? newHandicap();
      persistHandicap();
      showHandicap();
    }
  }
  function showHandicap() {
    if (!handicapState) return;
    const current = handicap.nextMatch(handicapState), last = handicapState.lastResult;
    const result = last ? `<p class="last-result" role="status">${last.won ? "You won" : "You lost"} ${last.playerScore}–${last.cpuScore}.${last.won ? "" : " Retry this stage whenever you're ready."}</p>` : "";
    const stages = handicap.START_SCORES.map((score, stage) => {
      const win = handicapState.wins[stage], isCurrent = current?.stage === stage;
      return `<li${isCurrent ? ' aria-current="step"' : ""}><strong>0–${score}</strong><span>${win ? `Won ${win.playerScore}–${win.cpuScore}` : isCurrent ? "Current stage" : "Next stage"}</span></li>`;
    }).join("");
    const label = current ? `${last && !last.won ? "Retry" : "Play"} from 0–${current.startingScore}` : "Play again";
    show(`<div class="handicap-page"><header class="finals-header"><div><h1>${current ? "CPU Handicap" : "Handicap challenge complete!"}</h1><p>${current ? `Stage ${current.stage + 1} of 5. Win to increase the CPU's starting score.` : "Five comeback wins, from 0–6 through 0–10."}</p>${result}</div><button class="quiet-button" data-action="modes">Choose mode</button></header>
      <p class="finals-difficulty">${difficulty.profiles[handicapState.difficulty].label} difficulty</p>
      <div class="chosen-country">${flag(handicapState.playerId)}<strong>${escape(countryName(handicapState.playerId))}</strong><span>vs</span>${flag(handicapState.opponentId)}<strong>${escape(countryName(handicapState.opponentId))} (CPU)</strong></div>
      <section class="match-brief" aria-label="${current ? "Starting score" : "Challenge result"}">${current ? handicapScore(current.startingScore) : art("cup0", "winner-cup")}<button class="play-button" data-action="${current ? "play-handicap" : "new-handicap"}">${label}</button></section>
      <p>You start at 0. First to 11, win by two. A loss keeps you on the same stage.</p>
      <h2 class="handicap-stages-title">Starting scores <span>You – CPU</span></h2><ol class="handicap-stages" aria-label="Five handicap stages">${stages}</ol>
    </div>`, "handicapProgress");
  }
  function playHandicap() {
    if (activeMatch || mode !== "handicap" || gameState !== "handicapProgress" || !handicapState) return;
    const match = handicap.nextMatch(handicapState);
    if (!match) return;
    activeMatch = match;
    stopScreen();
    hide();
    gameState = "handicapLaunching";
    difficulty.select(handicapState.difficulty);
    Object.assign(oGameData, { userId: handicapState.playerId, enemyId: handicapState.opponentId, cupId: 0, gameId: 0 });
    initGame();
  }
  function finishHandicap() {
    if (!activeMatch || !handicapState || gameState !== "game") return;
    handicapState = handicap.record(handicapState, activeMatch.token, oGameData.userScore, oGameData.enemyScore);
    activeMatch = null;
    persistHandicap();
    playSound(handicapState.lastResult.won ? "winGame" : "loseGame");
    showHandicap();
  }
  function teamLine(id, score, winner, playerId, placeholder) {
    if (id === null) return `<div class="bracket-team pending"><span>${placeholder}</span></div>`;
    return `<div class="bracket-team${winner === id ? " won" : ""}${id === playerId ? " player-team" : ""}">${flag(id)}<span class="team-name" title="${escape(countryName(id))}">${escape(countryName(id))}${id === playerId ? '<small>YOU</small>' : ""}</span><b>${score ?? ""}</b></div>`;
  }
  function showBracket() {
    if (!state) return;
    const next = tournament.nextMatch(state);
    let title = "Finals system", summary = "32 countries · Single elimination · First to 11, win by two";
    let action = next ? `<button class="play-button" data-action="play-final">Play ${tournament.ROUND_NAMES[state.round].toLowerCase()}</button>` : '<button class="play-button" data-action="new-finals">Start new finals</button>';
    if (state.status === "champion") { title = `${countryName(state.playerId)} wins the finals!`; summary = "Five wins. Finals champions."; }
    if (state.status === "eliminated") { title = `Eliminated in the ${tournament.ROUND_NAMES[state.round].toLowerCase()}`; summary = `${countryName(state.champion)} wins the finals. The full results are below.`; }
    const matchup = next ? `<div class="next-match">${flag(state.playerId)}<strong>${escape(countryName(state.playerId))}</strong><span>vs</span>${flag(next.opponentId)}<strong>${escape(countryName(next.opponentId))}</strong></div>` : `${art("cup0", "winner-cup")}`;
    const result = lastResult ? `<p class="last-result" role="status">${lastResult.won ? "You won" : "You lost"} ${lastResult.playerScore}–${lastResult.opponentScore} against ${escape(countryName(lastResult.opponentId))}.</p>` : "";
    const columns = state.rounds.map((matches, round) => `<section class="bracket-column" data-round="${round}" aria-label="${tournament.ROUND_NAMES[round]}"><h2>${tournament.ROUND_NAMES[round]}</h2><ol class="round-matches">${matches.map((match, index) => {
      const current = next && next.round === round && next.index === index;
      return `<li class="match-cell" style="grid-row: ${index * (2 ** (round + 1)) + 1} / span ${2 ** (round + 1)}"><div class="bracket-match${current ? " current-match" : ""}"${current ? ' aria-label="Your next match"' : ""}>${teamLine(match.home, match.score?.[0], match.winner, state.playerId, `Winner of match ${index * 2 + 1}`)}${teamLine(match.away, match.score?.[1], match.winner, state.playerId, `Winner of match ${index * 2 + 2}`)}</div></li>`;
    }).join("")}</ol></section>`).join("");
    show(`<div class="finals-page"><header class="finals-header"><div><h1>${escape(title)}</h1><p>${escape(summary)}</p>${result}</div><button class="quiet-button" data-action="modes">Choose mode</button></header>
      <p class="finals-difficulty">${difficulty.profiles[state.difficulty].label} difficulty</p>
      <section class="match-brief" aria-label="${next ? "Your next match" : "Tournament result"}">${matchup}${action}</section>
      <nav class="round-navigation" aria-label="Bracket rounds">${tournament.ROUND_NAMES.map((name, index) => `<button data-action="round" data-round="${index}"${index === state.round ? ' aria-current="step"' : ""}>${name}</button>`).join("")}</nav>
      <div class="bracket-scroll" tabindex="0" aria-label="Full 32-country bracket; scroll to see all rounds"><div class="bracket-board">${columns}</div></div>
    </div>`, "finalsBracket");
    requestAnimationFrame(() => {
      if (gameState !== "finalsBracket") return;
      const board = flow.querySelector(".bracket-scroll");
      const column = flow.querySelector(`[data-round="${state.round}"].bracket-column`);
      if (board && column) board.scrollLeft = column.offsetLeft - board.offsetLeft;
      const current = flow.querySelector(".current-match");
      if (board && current) board.scrollTop += current.getBoundingClientRect().top - board.getBoundingClientRect().top - 64;
    });
  }
  function playFinal() {
    if (activeMatch || mode !== "finals" || !state) return;
    const match = tournament.nextMatch(state);
    if (!match) return;
    activeMatch = match;
    stopScreen();
    hide();
    gameState = "finalsLaunching";
    difficulty.select(state.difficulty);
    // Finals opponents use the draw's level, independently of world-tour IDs.
    Object.assign(oGameData, { userId: state.playerId, enemyId: match.opponentId, cupId: 0, gameId: 0, userScore: 0, enemyScore: 0 });
    initGame();
  }
  function finishFinal() {
    if (!activeMatch || !state || gameState !== "game") return;
    const match = activeMatch;
    const playerScore = oGameData.userScore, opponentScore = oGameData.enemyScore;
    state = tournament.record(state, match.token, playerScore, opponentScore);
    activeMatch = null;
    lastResult = { playerScore, opponentScore, opponentId: match.opponentId, won: playerScore > opponentScore };
    persist();
    playSound(lastResult.won ? "winGame" : "loseGame");
    showBracket();
  }
  window.initGameComplete = function() {
    if (mode === "finals") return finishFinal();
    if (mode === "handicap") return finishHandicap();
    return original.complete();
  };
  window.initStartScreen = function() {
    activeMatch = null;
    mode = null;
    restoreWorld();
    stopScreen();
    hide();
    return original.start();
  };
  window.butEventHandler = function(id, data) {
    if (["playFromStart", "cupsFromStart", "changeCountryFromStart"].includes(id)) return chooseCountry();
    if (id === "countryChoice") {
      const selected = countryFlags.aIds[data?.id];
      if (!Number.isInteger(selected)) return;
      oGameData.userId = selected;
      saveDataHandler.setUserId(selected);
      saveDataHandler.saveData();
      return showModes();
    }
    if ((mode === "finals" || mode === "handicap") && id === "quitFromPause") {
      activeMatch = null;
      if (window.audioType === 1 && !window.muted) { Howler.mute(false); playMusic(); }
      return mode === "finals" ? showBracket() : showHandicap();
    }
    return original.button(id, data);
  };
  flow.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button || !flow.contains(button)) return;
    const action = button.dataset.action;
    if (Object.hasOwn(modeNames, action)) chooseMode(action);
    else if (action === "difficulty") chooseDifficulty(button.dataset.level);
    else if (action === "country") chooseCountry();
    else if (action === "modes") showModes();
    else if (action === "home") initStartScreen();
    else if (action === "play-final") playFinal();
    else if (action === "play-handicap") playHandicap();
    else if (action === "new-handicap" && mode === "handicap" && gameState === "handicapProgress" && handicapState?.status === "complete") {
      difficulty.select(handicapState.difficulty); handicapState = newHandicap(); persistHandicap(); showHandicap();
    }
    else if (action === "new-finals" && state?.status !== "active") {
      difficulty.select(state.difficulty); state = newDraw(); lastResult = null; persist(); showBracket();
    } else if (action === "round") {
      const column = flow.querySelector(`.bracket-column[data-round="${Number(button.dataset.round)}"]`);
      column?.scrollIntoView({ block: "nearest", inline: "start", behavior: "auto" });
    }
  });
  window.TableTennisModes = {
    chooseCountry, chooseMode, chooseDifficulty, showModes, showBracket, playFinal, showHandicap, playHandicap,
    get handicap() { return handicapState ? JSON.parse(JSON.stringify(handicapState)) : null; },
    get mode() { return mode; }, get finals() { return state ? JSON.parse(JSON.stringify(state)) : null; }
  };
})();
