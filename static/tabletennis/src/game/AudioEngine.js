// Plain browser JavaScript. Loaded in order by the HTML page.
(() => {
"use strict";
window.RallyEleven ??= {};
class AudioEngine {
    enabled = true;
    context;
    ensureContext() {
        if (!this.enabled) return undefined;
        this.context ??= new AudioContext();
        if (this.context.state === "suspended") void this.context.resume();
        return this.context;
    }
    tone(frequency, duration, volume, type) {
        const context = this.ensureContext();
        if (!context) return;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * 0.72), now + duration);
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + duration);
    }
    paddle(power = 1) {
        const strength = Math.max(0, Math.min(1, (power - 0.7) / 1.1));
        this.tone(145 + strength * 90, 0.055 + strength * 0.025, 0.045 + strength * 0.045, "triangle");
    }
    table() {
        this.tone(245, 0.038, 0.035, "sine");
    }
    point(won) {
        this.tone(won ? 520 : 185, won ? 0.18 : 0.24, 0.05, won ? "sine" : "sawtooth");
    }
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

Object.assign(window.RallyEleven, { AudioEngine });
})();
