// Plain browser JavaScript. Loaded in order by the HTML page.
(() => {
"use strict";
window.RallyEleven ??= {};
const { CourtGeometry, NET_HEIGHT, NET_Z, PLAYER_PLANE, TABLE_HALF_WIDTH, TABLE_LENGTH } = window.RallyEleven;
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
class CourtRenderer {
    canvas;
    context;
    width = 1;
    height = 1;
    trails = [];
    contactFlash = 0;
    contactPosition = null;
    contactPower = 0;
    court;
    lastBallActive = false;
    ballRotation = 0;
    reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    constructor(canvas, court = new CourtGeometry()){
        this.canvas = canvas;
        this.court = court;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas 2D is not available");
        this.context = context;
    }
    screenToPaddle(clientX, clientY, pointerType) {
        this.resize();
        const rect = this.canvas.getBoundingClientRect();
        return this.court.pointerToPaddle(clientX - rect.left, clientY - rect.top, pointerType);
    }
    flashContact(position, power = 1) {
        this.contactFlash = 1;
        this.contactPosition = position;
        this.contactPower = clamp((power - 0.7) / 1.1, 0, 1);
    }
    render(engine, dt) {
        this.resize();
        if (engine.ball.active && dt > 0) {
            this.trails.push({
                x: engine.ball.x,
                y: engine.ball.y,
                z: engine.ball.z,
                age: 0
            });
            if (this.trails.length > 18) this.trails.shift();
        } else if (!engine.ball.active && this.lastBallActive) {
            this.trails = [];
        }
        this.lastBallActive = engine.ball.active;
        for (const point of this.trails)point.age += dt;
        this.trails = this.trails.filter((point)=>point.age < 0.28);
        this.contactFlash = Math.max(0, this.contactFlash - dt * 4.8);
        if (!this.reducedMotion.matches && engine.ball.active) {
            const spin = Math.hypot(engine.ball.spin, engine.ball.topspin ?? 0);
            const direction = Math.sign(Math.abs(engine.ball.spin) > Math.abs(engine.ball.topspin ?? 0) ? engine.ball.spin : engine.ball.topspin ?? 0);
            // Slow the visual rotation so fast spin stays readable on a phone.
            this.ballRotation = (this.ballRotation + direction * spin * dt * Math.PI * 0.4) % (Math.PI * 2);
        }
        this.drawArena();
        this.drawTable();
        this.drawPaddle(engine.opponentPaddle.x, engine.opponentPaddle.y, TABLE_LENGTH - 0.06, "#154c5c", false, engine.opponentPaddle.vx);
        this.drawTrail();
        this.drawPaddle(engine.playerPaddle.x, engine.playerPaddle.y, PLAYER_PLANE, "#ff5a36", true, engine.playerPaddle.vx);
        if (engine.ball.active) this.drawBall(engine.ball);
        this.drawContact();
    }
    resize() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const displayWidth = Math.max(1, Math.round(rect.width));
        const displayHeight = Math.max(1, Math.round(rect.height));
        const nextWidth = Math.round(displayWidth * dpr);
        const nextHeight = Math.round(displayHeight * dpr);
        if (this.canvas.width !== nextWidth || this.canvas.height !== nextHeight) {
            this.canvas.width = nextWidth;
            this.canvas.height = nextHeight;
        }
        this.width = displayWidth;
        this.height = displayHeight;
        this.court.resize(displayWidth, displayHeight);
        this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    project(point) {
        return this.court.project(point);
    }
    drawArena() {
        const ctx = this.context;
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.fillStyle = "#061722";
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = "#0b2a37";
        ctx.fillRect(0, this.height * 0.13, this.width, this.height * 0.29);
        ctx.fillStyle = "#113746";
        for(let index = 0; index < 7; index += 1){
            const x = index / 6 * this.width;
            ctx.beginPath();
            ctx.moveTo(x - this.width * 0.08, this.height * 0.42);
            ctx.lineTo(x + this.width * 0.025, this.height * 0.17);
            ctx.lineTo(x + this.width * 0.085, this.height * 0.17);
            ctx.lineTo(x + this.width * 0.17, this.height * 0.42);
            ctx.closePath();
            ctx.fill();
        }
        ctx.fillStyle = "#c98d58";
        ctx.fillRect(0, this.height * 0.42, this.width, this.height * 0.58);
        ctx.strokeStyle = "rgba(78, 43, 28, 0.28)";
        ctx.lineWidth = 1;
        for(let index = 0; index < 12; index += 1){
            const y = this.height * 0.42 + index / 12 * this.height * 0.58;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }
        ctx.fillStyle = "#f1dfb8";
        for(let index = 0; index < 4; index += 1){
            const x = this.width * (0.2 + index * 0.2);
            ctx.globalAlpha = 0.42;
            ctx.fillRect(x - this.width * 0.06, this.height * 0.08, this.width * 0.12, 2);
        }
        ctx.globalAlpha = 1;
    }
    drawTable() {
        const ctx = this.context;
        const nearLeft = this.project({
            x: -TABLE_HALF_WIDTH,
            y: 0,
            z: 0
        });
        const nearRight = this.project({
            x: TABLE_HALF_WIDTH,
            y: 0,
            z: 0
        });
        const farLeft = this.project({
            x: -TABLE_HALF_WIDTH,
            y: 0,
            z: TABLE_LENGTH
        });
        const farRight = this.project({
            x: TABLE_HALF_WIDTH,
            y: 0,
            z: TABLE_LENGTH
        });
        ctx.fillStyle = "rgba(5, 20, 27, 0.3)";
        ctx.beginPath();
        ctx.moveTo(nearLeft.x + 10, nearLeft.y + 12);
        ctx.lineTo(nearRight.x + 10, nearRight.y + 12);
        ctx.lineTo(farRight.x + 4, farRight.y + 5);
        ctx.lineTo(farLeft.x + 4, farLeft.y + 5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#176a66";
        ctx.beginPath();
        ctx.moveTo(nearLeft.x, nearLeft.y);
        ctx.lineTo(nearRight.x, nearRight.y);
        ctx.lineTo(farRight.x, farRight.y);
        ctx.lineTo(farLeft.x, farLeft.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#f5eddb";
        ctx.lineWidth = Math.max(1.25, this.width * 0.0022);
        ctx.stroke();
        const centerNear = this.project({
            x: 0,
            y: 0.002,
            z: 0
        });
        const centerFar = this.project({
            x: 0,
            y: 0.002,
            z: TABLE_LENGTH
        });
        ctx.beginPath();
        ctx.moveTo(centerNear.x, centerNear.y);
        ctx.lineTo(centerFar.x, centerFar.y);
        ctx.stroke();
        const netLeft = this.project({
            x: -TABLE_HALF_WIDTH * 1.06,
            y: NET_HEIGHT,
            z: NET_Z
        });
        const netRight = this.project({
            x: TABLE_HALF_WIDTH * 1.06,
            y: NET_HEIGHT,
            z: NET_Z
        });
        const netLeftBase = this.project({
            x: -TABLE_HALF_WIDTH * 1.06,
            y: 0,
            z: NET_Z
        });
        const netRightBase = this.project({
            x: TABLE_HALF_WIDTH * 1.06,
            y: 0,
            z: NET_Z
        });
        ctx.fillStyle = "rgba(7, 27, 39, 0.88)";
        ctx.beginPath();
        ctx.moveTo(netLeft.x, netLeft.y);
        ctx.lineTo(netRight.x, netRight.y);
        ctx.lineTo(netRightBase.x, netRightBase.y);
        ctx.lineTo(netLeftBase.x, netLeftBase.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#e8dec9";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(netLeft.x, netLeft.y);
        ctx.lineTo(netRight.x, netRight.y);
        ctx.stroke();
    }
    drawTrail() {
        const ctx = this.context;
        for (const point of this.trails){
            const projected = this.project(point);
            const alpha = clamp(1 - point.age / 0.28, 0, 1) * 0.42;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = "#ffbf59";
            ctx.beginPath();
            ctx.arc(projected.x, projected.y, Math.max(1.5, 5 * projected.scale * alpha), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    drawBall(ball) {
        const ctx = this.context;
        const projected = this.project(ball);
        const radius = this.court.ballRadius(ball);
        const shadow = this.project({ ...ball, y: 0 });
        const shadowScale = clamp(1 - Math.max(0, ball.y) * 0.45, 0.4, 1);
        ctx.fillStyle = `rgba(2, 17, 24, ${0.3 * shadowScale})`;
        ctx.beginPath();
        ctx.ellipse(shadow.x, shadow.y + 2, radius * shadowScale * 1.1, radius * shadowScale * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffcb54";
        ctx.beginPath();
        ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
        ctx.fill();
        if (Math.hypot(ball.spin, ball.topspin ?? 0) > 0.5) {
            ctx.save();
            ctx.translate(projected.x, projected.y);
            ctx.rotate(this.reducedMotion.matches ? 0 : this.ballRotation);
            ctx.strokeStyle = "#09202b";
            ctx.lineWidth = Math.max(1, radius * 0.16);
            ctx.beginPath();
            ctx.ellipse(0, 0, radius * 0.34, radius * 0.79, 0, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();
            ctx.restore();
        }
        ctx.fillStyle = "#fff4c7";
        ctx.beginPath();
        ctx.arc(projected.x - radius * 0.3, projected.y - radius * 0.34, radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
    }
    drawPaddle(x, y, z, color, foreground, velocityX) {
        const ctx = this.context;
        const projected = this.project({
            x,
            y,
            z
        });
        const shape = this.court.paddleShape(z, velocityX, x);
        const radius = shape.y;
        const tilt = shape.angle;
        ctx.save();
        ctx.translate(projected.x, projected.y);
        ctx.rotate(tilt);
        ctx.fillStyle = "rgba(4, 14, 20, 0.35)";
        ctx.beginPath();
        ctx.ellipse(4, radius * 0.25 + 5, radius * 0.82, radius, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#b47a43";
        ctx.fillRect(-radius * 0.13, radius * 0.72, radius * 0.26, radius * 0.95);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 0.82, radius, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = foreground ? "#ffddcf" : "#8dd3d1";
        ctx.lineWidth = Math.max(1.5, radius * 0.055);
        ctx.stroke();
        ctx.restore();
    }
    drawContact() {
        if (this.contactFlash <= 0 || !this.contactPosition) return;
        const ctx = this.context;
        const point = this.project(this.contactPosition);
        const radius = this.court.ballRadius(this.contactPosition);
        ctx.save();
        ctx.globalAlpha = this.contactFlash * (0.5 + this.contactPower * 0.4);
        ctx.strokeStyle = "#ffcb54";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius * (1.2 + (1 - this.contactFlash) * (1.4 + this.contactPower * 2)), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}
function startAttractMode(canvas) {
    const renderer = new CourtRenderer(canvas);
    const mock = {
        playerPaddle: {
            x: 0,
            y: 0.22,
            vx: 0,
            vy: 0
        },
        opponentPaddle: {
            x: 0,
            y: 0.25,
            vx: 0,
            vy: 0
        },
        ball: {
            x: 0,
            y: 0.3,
            z: 1.3,
            vx: 0,
            vy: 0,
            vz: 0,
            spin: 0,
            active: true
        }
    };
    let frame = 0;
    let previous = performance.now();
    const start = previous;
    const render = (now)=>{
        const t = (now - start) / 1000;
        const cycle = t % 2.4 / 2.4;
        const towardOpponent = cycle < 0.5;
        const progress = towardOpponent ? cycle * 2 : (1 - cycle) * 2;
        mock.ball.z = 0.12 + progress * (TABLE_LENGTH - 0.24);
        mock.ball.x = Math.sin(t * 2.65) * 0.36;
        mock.ball.y = 0.07 + Math.sin(progress * Math.PI) * 0.42;
        mock.playerPaddle.x = Math.sin(t * 2.2) * 0.18;
        mock.opponentPaddle.x = Math.sin(t * 2.65) * 0.34;
        renderer.render(mock, Math.min(0.033, (now - previous) / 1000));
        previous = now;
        frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return ()=>cancelAnimationFrame(frame);
}

Object.assign(window.RallyEleven, { CourtRenderer, startAttractMode });
})();
