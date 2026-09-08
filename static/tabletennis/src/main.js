// Plain browser JavaScript. Loaded in order by the HTML page.
(() => {
"use strict";
window.RallyEleven ??= {};
const { DIFFICULTIES, getDifficulty } = window.RallyEleven;
const { startAttractMode } = window.RallyEleven;
const { MatchGame } = window.RallyEleven;
const { Tournament } = window.RallyEleven;
const STORAGE_KEY = "rally-eleven-tournament";
const DIFFICULTY_KEY = "rally-eleven-difficulty";
function getStoredDifficulty() {
    const value = window.RallyEleven.storage.getItem(DIFFICULTY_KEY);
    return DIFFICULTIES.some((difficulty)=>difficulty.id === value) ? value : "club";
}
class RallyElevenApp {
    root;
    difficultyId = getStoredDifficulty();
    tournament;
    matchGame;
    stopAttract;
    constructor(root){
        this.root = root;
        this.tournament = this.restoreTournament();
        this.renderHome();
    }
    clearScreen() {
        this.matchGame?.destroy();
        this.matchGame = undefined;
        this.stopAttract?.();
        this.stopAttract = undefined;
        this.root.innerHTML = "";
    }
    restoreTournament() {
        try {
            const stored = window.RallyEleven.storage.getItem(STORAGE_KEY);
            if (!stored) return undefined;
            const snapshot = JSON.parse(stored);
            const tournament = Tournament.fromSnapshot(snapshot);
            return tournament.status === "active" ? tournament : undefined;
        } catch  {
            window.RallyEleven.storage.removeItem(STORAGE_KEY);
            return undefined;
        }
    }
    saveTournament() {
        if (!this.tournament) return;
        window.RallyEleven.storage.setItem(STORAGE_KEY, JSON.stringify(this.tournament.serialize()));
    }
    renderHome() {
        this.clearScreen();
        const continueMatch = this.tournament?.getCurrentPlayerMatch();
        this.root.innerHTML = `
      <section class="home-screen">
        <canvas class="ambient-court" aria-hidden="true"></canvas>
        <header class="home-header">
          <a class="brand-lockup" href="#" aria-label="Rally Eleven home">
            <span>RALLY</span><i>//</i><span>ELEVEN</span>
          </a>
          <span class="orientation-note">Built for landscape play</span>
        </header>
        <div class="home-panel">
          <h1>Win the draw.<br />Earn every point.</h1>
          <p class="home-intro">Direct paddle control, real table-tennis scoring, and opponents that learn to attack the space you leave open.</p>
          <fieldset class="difficulty-fieldset">
            <legend>Choose your level</legend>
            <div class="difficulty-list">
              ${DIFFICULTIES.map((difficulty)=>`
                <button class="difficulty-option ${difficulty.id === this.difficultyId ? "is-selected" : ""}" type="button" data-difficulty="${difficulty.id}" aria-pressed="${difficulty.id === this.difficultyId}">
                  <strong>${difficulty.label}</strong>
                  <span>${difficulty.description}</span>
                </button>
              `).join("")}
            </div>
            <p class="difficulty-summary" data-difficulty-summary><strong>${getDifficulty(this.difficultyId).label}:</strong> ${getDifficulty(this.difficultyId).description}</p>
          </fieldset>
          <div class="format-line" aria-label="Tournament format">
            <span>8 players</span><span>Knockout draw</span><span>First to 11</span>
          </div>
          <div class="home-actions">
            <button class="primary-action primary-action--wide" type="button" data-new-tournament>Enter new tournament</button>
            ${continueMatch ? `<button class="secondary-action" type="button" data-continue>Continue ${continueMatch.round.toLowerCase()}</button>` : ""}
          </div>
        </div>
      </section>
    `;
        const canvas = this.root.querySelector(".ambient-court");
        if (canvas) this.stopAttract = startAttractMode(canvas);
        this.root.querySelectorAll("[data-difficulty]").forEach((button)=>{
            button.addEventListener("click", ()=>{
                this.difficultyId = button.dataset.difficulty;
                window.RallyEleven.storage.setItem(DIFFICULTY_KEY, this.difficultyId);
                this.root.querySelectorAll("[data-difficulty]").forEach((option)=>{
                    const selected = option === button;
                    option.classList.toggle("is-selected", selected);
                    option.setAttribute("aria-pressed", String(selected));
                });
                const summary = this.root.querySelector("[data-difficulty-summary]");
                const difficulty = getDifficulty(this.difficultyId);
                if (summary) summary.innerHTML = `<strong>${difficulty.label}:</strong> ${difficulty.description}`;
            });
        });
        this.root.querySelector("[data-new-tournament]")?.addEventListener("click", ()=>{
            this.tournament = new Tournament(this.difficultyId);
            this.saveTournament();
            this.renderBracket();
        });
        this.root.querySelector("[data-continue]")?.addEventListener("click", ()=>this.renderBracket());
        this.root.querySelector(".brand-lockup")?.addEventListener("click", (event)=>event.preventDefault());
    }
    renderBracket() {
        if (!this.tournament) {
            this.renderHome();
            return;
        }
        this.clearScreen();
        const rounds = this.tournament.getRounds();
        const currentMatch = this.tournament.getCurrentPlayerMatch();
        const opponent = currentMatch ? this.tournament.getOpponent(currentMatch) : undefined;
        const roundColumns = [
            {
                name: "Quarterfinal",
                count: 4
            },
            {
                name: "Semifinal",
                count: 2
            },
            {
                name: "Final",
                count: 1
            }
        ];
        this.root.innerHTML = `
      <section class="bracket-screen">
        <header class="bracket-header">
          <button class="text-action text-action--light" type="button" data-home>Home</button>
          <a class="brand-lockup brand-lockup--small" href="#" aria-label="Rally Eleven home"><span>RALLY</span><i>//</i><span>ELEVEN</span></a>
          <span class="difficulty-stamp">${getDifficulty(this.tournament.difficultyId).label}</span>
        </header>
        <div class="bracket-title">
          <div>
            <h1>The championship draw</h1>
            <p>Lose once and the run is over. Win three matches to take the Eleven Cup.</p>
          </div>
          <div class="cup-mark" aria-label="Eleven Cup">
            <span>11</span><small>CUP</small>
          </div>
        </div>
        <div class="bracket-grid" aria-label="Eight-player knockout bracket">
          ${roundColumns.map((column)=>`
            <section class="bracket-round">
              <h2>${column.name}</h2>
              <div class="round-matches">
                ${Array.from({
                length: column.count
            }, (_, index)=>this.renderBracketMatch(rounds[column.name][index], column.name, index)).join("")}
              </div>
            </section>
          `).join("")}
        </div>
        ${currentMatch && opponent ? `
          <footer class="next-match-strip">
            <div class="next-opponent">
              <span>Next: ${currentMatch.round}</span>
              <strong><i style="--mark: ${opponent.color}"></i>${opponent.name}</strong>
              <small>${opponent.style} style · seed ${opponent.seed}</small>
            </div>
            <button class="primary-action" type="button" data-play>Play ${currentMatch.round}</button>
          </footer>
        ` : ""}
      </section>
    `;
        this.root.querySelector("[data-home]")?.addEventListener("click", ()=>this.renderHome());
        this.root.querySelector(".brand-lockup")?.addEventListener("click", (event)=>{
            event.preventDefault();
            this.renderHome();
        });
        this.root.querySelector("[data-play]")?.addEventListener("click", ()=>this.startMatch());
    }
    renderBracketMatch(match, round, index) {
        if (!this.tournament || !match) {
            return `
        <div class="bracket-match is-pending" aria-label="${round} match ${index + 1} pending">
          <span><i></i>To be decided</span><span><i></i>To be decided</span>
        </div>
      `;
        }
        const a = this.findCompetitor(match.a);
        const b = this.findCompetitor(match.b);
        return `
      <div class="bracket-match ${!match.winnerId ? "is-current" : ""}">
        ${this.renderBracketEntrant(a, match.winnerId === a.id)}
        ${this.renderBracketEntrant(b, match.winnerId === b.id)}
        ${match.score ? `<small class="match-score">${match.score}</small>` : ""}
      </div>
    `;
    }
    renderBracketEntrant(competitor, winner) {
        return `<span class="${winner ? "is-winner" : ""}"><i style="--mark: ${competitor.color}"></i><b>${competitor.name}</b><em>#${competitor.seed}</em></span>`;
    }
    findCompetitor(id) {
        const competitor = this.tournament?.competitors.find((entry)=>entry.id === id);
        if (!competitor) throw new Error(`Unknown competitor: ${id}`);
        return competitor;
    }
    startMatch() {
        const match = this.tournament?.getCurrentPlayerMatch();
        if (!this.tournament || !match) return;
        const opponent = this.tournament.getOpponent(match);
        this.clearScreen();
        this.matchGame = new MatchGame(this.root, {
            opponent,
            difficulty: getDifficulty(this.tournament.difficultyId),
            round: match.round,
            onComplete: (won, playerScore, opponentScore)=>this.finishMatch(won, playerScore, opponentScore, opponent),
            onForfeit: ()=>this.finishMatch(false, 0, 11, opponent)
        });
    }
    finishMatch(won, playerScore, opponentScore, opponent) {
        if (!this.tournament) return;
        this.tournament.recordPlayerResult(won, playerScore, opponentScore);
        this.saveTournament();
        this.renderResult(won, playerScore, opponentScore, opponent);
    }
    renderResult(won, playerScore, opponentScore, opponent) {
        if (!this.tournament) return;
        this.clearScreen();
        const champion = this.tournament.status === "champion";
        const eliminated = this.tournament.status === "eliminated";
        const title = champion ? "Eleven Cup champion" : eliminated ? "Run over" : "You advance";
        const summary = champion ? "Three matches. One draw survived. The cup is yours." : eliminated ? `${opponent.name} closes the match. Start a fresh draw when you are ready.` : "The bracket has moved. Your next opponent is already waiting.";
        this.root.innerHTML = `
      <section class="result-screen ${won ? "is-win" : "is-loss"}">
        <a class="brand-lockup brand-lockup--small" href="#" aria-label="Rally Eleven home"><span>RALLY</span><i>//</i><span>ELEVEN</span></a>
        <div class="result-score" aria-label="Final score ${playerScore} to ${opponentScore}">
          <span><small>YOU</small>${playerScore}</span>
          <i>—</i>
          <span><small>${opponent.code}</small>${opponentScore}</span>
        </div>
        <div class="result-copy">
          <h1>${title}</h1>
          <p>${summary}</p>
        </div>
        <div class="result-actions">
          ${this.tournament.status === "active" ? `<button class="primary-action" type="button" data-next>View updated draw</button>` : `<button class="primary-action" type="button" data-restart>Enter a new draw</button>`}
          <button class="text-action text-action--light" type="button" data-home>Back home</button>
        </div>
      </section>
    `;
        this.root.querySelector(".brand-lockup")?.addEventListener("click", (event)=>{
            event.preventDefault();
            this.renderHome();
        });
        this.root.querySelector("[data-next]")?.addEventListener("click", ()=>this.renderBracket());
        this.root.querySelector("[data-restart]")?.addEventListener("click", ()=>{
            this.tournament = new Tournament(this.difficultyId);
            this.saveTournament();
            this.renderBracket();
        });
        this.root.querySelector("[data-home]")?.addEventListener("click", ()=>this.renderHome());
    }
}
const root = document.querySelector("#app");
if (!root) throw new Error("App root not found");
new RallyElevenApp(root);
})();
