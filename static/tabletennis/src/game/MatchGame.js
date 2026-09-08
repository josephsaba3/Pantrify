// Plain browser JavaScript. Loaded in order by the HTML page.
(() => {
"use strict";
window.RallyEleven ??= {};
const { AudioEngine } = window.RallyEleven;
const { CourtRenderer } = window.RallyEleven;
const { MatchEngine } = window.RallyEleven;
function roundIndex(round) {
    if (round === "Quarterfinal") return 0;
    if (round === "Semifinal") return 1;
    return 2;
}
class MatchGame {
    root;
    options;
    engine;
    renderer;
    audio = new AudioEngine();
    canvas;
    scorePlayer;
    scoreOpponent;
    serveOverlay;
    pointCall;
    pauseOverlay;
    shotReadout;
    animationFrame = 0;
    previousFrame = performance.now();
    lastPointerTime = null;
    activePointerId = null;
    paused = false;
    complete = false;
    rallyHasStarted = false;
    pointTimer;
    constructor(root, options){
        this.root = root;
        this.options = options;
        this.root.innerHTML = `
      <section class="match-shell" aria-label="${options.round} against ${options.opponent.name}">
        <canvas class="court-canvas" aria-label="Interactive table-tennis court" tabindex="0"></canvas>
        <header class="score-ribbon">
          <div class="score-player score-side is-serving">
            <span class="competitor-mark" style="--mark: #ff5a36">YOU</span>
            <strong class="score-number" data-score-player>0</strong>
          </div>
          <div class="score-center">
            <span>${options.round}</span>
            <b>FIRST TO 11 · WIN BY 2</b>
          </div>
          <div class="score-player score-side">
            <strong class="score-number" data-score-opponent>0</strong>
            <span class="competitor-mark" style="--mark: ${options.opponent.color}">${options.opponent.code}</span>
          </div>
        </header>
        <div class="match-tools">
          <button class="square-control" type="button" data-sound aria-label="Sound is on; press to mute">SOUND ON</button>
          <button class="square-control" type="button" data-pause>PAUSE</button>
        </div>
        <div class="point-call" aria-live="polite"></div>
        <output class="shot-readout" aria-label="Your last hit" aria-live="off" hidden></output>
        <div class="serve-overlay">
          <div class="serve-ticket">
            <span>${options.difficulty.label} · ${options.opponent.style}</span>
            <strong data-serve-label>Open the rally</strong>
            <button class="primary-action" type="button" data-serve>Serve</button>
            <small>Brush up for power, sideways for spin, or down for a slower return. Firm forward strokes reach the speed limit.</small>
          </div>
        </div>
        <div class="pause-overlay" hidden>
          <div class="pause-panel">
            <strong>Match paused</strong>
            <button class="primary-action" type="button" data-resume>Resume</button>
            <button class="text-action" type="button" data-forfeit>Forfeit match</button>
          </div>
        </div>
      </section>
    `;
        this.canvas = this.requireElement("canvas");
        this.scorePlayer = this.requireElement("[data-score-player]");
        this.scoreOpponent = this.requireElement("[data-score-opponent]");
        this.serveOverlay = this.requireElement(".serve-overlay");
        this.pointCall = this.requireElement(".point-call");
        this.pauseOverlay = this.requireElement(".pause-overlay");
        this.shotReadout = this.requireElement(".shot-readout");
        this.engine = new MatchEngine(options.difficulty, options.opponent.style, roundIndex(options.round));
        this.renderer = new CourtRenderer(this.canvas, this.engine.court);
        this.bindControls();
        this.updateServeUI();
        this.animationFrame = requestAnimationFrame(this.loop);
    }
    destroy() {
        cancelAnimationFrame(this.animationFrame);
        if (this.pointTimer) window.clearTimeout(this.pointTimer);
    }
    requireElement(selector) {
        const element = this.root.querySelector(selector);
        if (!element) throw new Error(`Missing match element: ${selector}`);
        return element;
    }
    bindControls() {
        this.canvas.addEventListener("pointerdown", (event)=>{
            if (this.paused || this.complete || this.activePointerId !== null) return;
            this.activePointerId = event.pointerId;
            this.canvas.setPointerCapture(event.pointerId);
            this.movePaddle(event, true);
        });
        this.canvas.addEventListener("pointermove", (event)=>{
            if (this.activePointerId !== null && event.pointerId !== this.activePointerId) return;
            if (event.pointerType === "mouse" || this.canvas.hasPointerCapture(event.pointerId)) {
                this.movePointerSamples(event);
            }
        });
        const releasePointer = (event)=>{
            if (event.pointerId !== this.activePointerId) return;
            if (event.type === "pointerup") this.movePointerSamples(event);
            else this.engine.resetPlayerStroke();
            this.activePointerId = null;
            this.lastPointerTime = null;
        };
        this.canvas.addEventListener("pointerup", releasePointer);
        this.canvas.addEventListener("pointercancel", releasePointer);
        this.canvas.addEventListener("lostpointercapture", releasePointer);
        this.canvas.addEventListener("pointerleave", ()=>{
            if (this.activePointerId === null) this.lastPointerTime = null;
        });
        this.canvas.addEventListener("keydown", (event)=>{
            if (this.paused || this.complete) return;
            const keyMovement = {
                ArrowLeft: [
                    -0.08,
                    0
                ],
                ArrowRight: [
                    0.08,
                    0
                ],
                ArrowUp: [
                    0,
                    0.06
                ],
                ArrowDown: [
                    0,
                    -0.06
                ]
            };
            const movement = keyMovement[event.key];
            if (!movement) return;
            event.preventDefault();
            this.engine.setPlayerPaddle(this.engine.playerPaddle.x + movement[0], this.engine.playerPaddle.y + movement[1], 0.07);
        });
        this.requireElement("[data-serve]").addEventListener("click", ()=>{
            this.serveOverlay.classList.add("is-hidden");
            this.rallyHasStarted = true;
            this.engine.serve();
        });
        this.requireElement("[data-pause]").addEventListener("click", ()=>this.setPaused(true));
        this.requireElement("[data-resume]").addEventListener("click", ()=>this.setPaused(false));
        this.requireElement("[data-forfeit]").addEventListener("click", ()=>{
            this.destroy();
            this.options.onForfeit();
        });
        this.requireElement("[data-sound]").addEventListener("click", (event)=>{
            const enabled = this.audio.toggle();
            const button = event.currentTarget;
            button.textContent = enabled ? "SOUND ON" : "SOUND OFF";
            button.setAttribute("aria-label", enabled ? "Sound is on; press to mute" : "Sound is off; press to enable");
        });
    }
    movePointerSamples(event) {
        const samples = event.getCoalescedEvents?.() ?? [];
        for (const sample of samples) this.movePaddle(sample);
        const last = samples[samples.length - 1];
        if (!last || last.clientX !== event.clientX || last.clientY !== event.clientY || last.timeStamp !== event.timeStamp) this.movePaddle(event);
    }
    movePaddle(event, reposition = false) {
        if (this.paused || this.complete) return;
        const now = event.timeStamp;
        const position = this.renderer.screenToPaddle(event.clientX, event.clientY, event.pointerType);
        if (reposition || this.lastPointerTime === null) {
            this.engine.placePlayerPaddle(position.x, position.y);
        } else {
            this.engine.setPlayerPaddle(position.x, position.y, Math.max(0, (now - this.lastPointerTime) / 1000));
        }
        this.lastPointerTime = Math.max(this.lastPointerTime ?? now, now);
    }
    setPaused(paused) {
        this.paused = paused;
        this.pauseOverlay.hidden = !paused;
        this.lastPointerTime = null;
        this.engine.resetPlayerStroke();
        this.previousFrame = performance.now();
    }
    loop = (now)=>{
        const dt = Math.min(0.034, Math.max(0, (now - this.previousFrame) / 1000));
        this.previousFrame = now;
        this.renderer.resize();
        if (!this.paused && !this.complete) {
            const events = this.engine.update(dt);
            this.handleEvents(events);
        }
        this.renderer.render(this.engine, this.paused || this.complete ? 0 : dt);
        this.animationFrame = requestAnimationFrame(this.loop);
    };
    handleEvents(events) {
        for (const event of events){
            if (event.type === "paddle") {
                this.audio.paddle(event.power);
                if (event.side === "player") {
                    const rpm = Math.round(Math.hypot(event.spin, event.topspin) * 60 / 10) * 10;
                    this.shotReadout.textContent = `${event.shot} · ${Math.round(event.speed * 3.6)} km/h · ${rpm} rpm`;
                    this.shotReadout.hidden = false;
                    this.renderer.flashContact(event.position, event.power);
                    if (navigator.vibrate) navigator.vibrate(Math.round(6 + event.power * 5));
                }
            }
            if (event.type === "table") this.audio.table();
            if (event.type === "point") this.handlePoint(event.scorer === "player", event.reason);
            if (event.type === "game") {
                this.complete = true;
                const won = event.winner === "player";
                this.pointTimer = window.setTimeout(()=>{
                    this.destroy();
                    this.options.onComplete(won, this.engine.playerScore, this.engine.opponentScore);
                }, 1050);
            }
        }
    }
    handlePoint(playerWon, reason) {
        this.scorePlayer.textContent = String(this.engine.playerScore);
        this.scoreOpponent.textContent = String(this.engine.opponentScore);
        this.audio.point(playerWon);
        this.pointCall.textContent = `${playerWon ? "Your point" : `${this.options.opponent.code} point`} · ${reason}`;
        this.pointCall.classList.remove("is-visible");
        void this.pointCall.offsetWidth;
        this.pointCall.classList.add("is-visible");
        this.pointTimer = window.setTimeout(()=>{
            if (!this.complete) this.updateServeUI();
        }, 760);
    }
    updateServeUI() {
        if (!this.engine.waitingForServe) return;
        const playerServing = this.engine.server === "player";
        this.root.querySelectorAll(".score-side").forEach((element, index)=>{
            element.classList.toggle("is-serving", playerServing ? index === 0 : index === 1);
        });
        if (this.rallyHasStarted) {
            this.serveOverlay.classList.add("is-hidden");
            this.engine.serve();
            return;
        }
        const label = this.requireElement("[data-serve-label]");
        const button = this.requireElement("[data-serve]");
        label.textContent = playerServing ? "Your serve" : `${this.options.opponent.code} serves`;
        button.textContent = playerServing ? "Serve" : "Ready";
        this.serveOverlay.classList.remove("is-hidden");
    }
}

Object.assign(window.RallyEleven, { MatchGame });
})();
