// Plain browser JavaScript. Loaded in order by the HTML page.
(() => {
"use strict";
window.RallyEleven ??= {};
const { hasWonGame, opposite, serverForPoint } = window.RallyEleven;
const { CourtGeometry, TABLE_LENGTH, TABLE_HALF_WIDTH, NET_Z, NET_HEIGHT, BALL_RADIUS, PLAYER_PLANE } = window.RallyEleven;
const OPPONENT_PLANE = TABLE_LENGTH - 0.075;
const GRAVITY = 9.81;
const MAX_STROKE_SPEED = 12;
const MAX_RETURN_PACE = 5.5;
const MAX_BALL_SPEED = 6.2; // Total speed, including bounce kicks and flight curvature.
const MAX_SPIN = 18; // Revolutions per second; an arcade scale, not a pro simulation.
const SIDE_SPIN_ACCELERATION = 0.05;
const TOP_SPIN_ACCELERATION = 0.045;
const SPIN_DECAY = 0.24;
function spinDisplacement(spin, pace, time, acceleration) {
    return spin * pace * acceleration * (Math.expm1(-SPIN_DECAY * time) + SPIN_DECAY * time) / SPIN_DECAY ** 2;
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function strokePower(speed) {
    return (1 - Math.exp(-clamp(speed - 0.18, 0, 6) / 2)) / (1 - Math.exp(-3));
}
function moveToward(current, target, maxDelta) {
    const delta = target - current;
    if (Math.abs(delta) <= maxDelta) return target;
    return current + Math.sign(delta) * maxDelta;
}
function interpolate(start, end, amount) {
    return { x: start.x + (end.x - start.x) * amount, y: start.y + (end.y - start.y) * amount };
}
function limitBallSpeed(ball) {
    const scale = Math.min(1, MAX_BALL_SPEED / Math.max(0.001, Math.hypot(ball.vx, ball.vy, ball.vz)));
    ball.vx *= scale;
    ball.vy *= scale;
    ball.vz *= scale;
}
function advanceBall(ball, dt) {
    ball.vx += ball.spin * ball.vz * SIDE_SPIN_ACCELERATION * dt;
    ball.vy -= (GRAVITY + ball.topspin * Math.abs(ball.vz) * TOP_SPIN_ACCELERATION) * dt;
    ball.spin *= Math.exp(-SPIN_DECAY * dt);
    ball.topspin *= Math.exp(-SPIN_DECAY * dt);
    ball.vx *= 1 - 0.025 * dt;
    ball.vz *= 1 - 0.012 * dt;
    limitBallSpeed(ball);
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.z += ball.vz * dt;
}
function sphereEntry(start, end) {
    const dx = end.x - start.x, dy = end.y - start.y, dz = end.z - start.z;
    const c = start.x ** 2 + start.y ** 2 + start.z ** 2 - BALL_RADIUS ** 2;
    if (c <= 0) return 0;
    const a = dx ** 2 + dy ** 2 + dz ** 2;
    if (a < 1e-12) return null;
    const b = 2 * (start.x * dx + start.y * dy + start.z * dz);
    const discriminant = b ** 2 - 4 * a * c;
    if (discriminant < 0) return null;
    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    return t >= 0 && t <= 1 ? t : null;
}
function tableContact(start, end) {
    if (end.y >= start.y || end.y > BALL_RADIUS || start.y < 0) return null;
    let first = null;
    const at = t => ({ ...interpolate(start, end, t), z: start.z + (end.z - start.z) * t });
    const add = (t, edge, valid, normal) => {
        if (t === null || t < 0 || t > 1 || first && first.t <= t) return;
        const point = at(t);
        if (point.y < -1e-8 || !valid(point)) return;
        first = { ...point, t, edge, normal: normal(point) };
    };
    const onTable = p => Math.abs(p.x) <= TABLE_HALF_WIDTH && p.z >= 0 && p.z <= TABLE_LENGTH;
    add((start.y - BALL_RADIUS) / (start.y - end.y), false, onTable, () => ({ x: 0, y: 1, z: 0 }));
    // The finite ball can clip a top edge after its centre has passed the line.
    // Sweep against the four edge cylinders and corner spheres, not an expanded rectangle.
    for (const x of [-TABLE_HALF_WIDTH, TABLE_HALF_WIDTH]) {
        const t = sphereEntry({ x: start.x - x, y: start.y, z: 0 }, { x: end.x - x, y: end.y, z: 0 });
        add(t, true, p => p.z >= 0 && p.z <= TABLE_LENGTH,
            p => ({ x: (p.x - x) / BALL_RADIUS, y: p.y / BALL_RADIUS, z: 0 }));
    }
    for (const z of [0, TABLE_LENGTH]) {
        const t = sphereEntry({ x: 0, y: start.y, z: start.z - z }, { x: 0, y: end.y, z: end.z - z });
        add(t, true, p => Math.abs(p.x) <= TABLE_HALF_WIDTH,
            p => ({ x: 0, y: p.y / BALL_RADIUS, z: (p.z - z) / BALL_RADIUS }));
    }
    for (const x of [-TABLE_HALF_WIDTH, TABLE_HALF_WIDTH]) for (const z of [0, TABLE_LENGTH]) {
        const t = sphereEntry({ x: start.x - x, y: start.y, z: start.z - z }, { x: end.x - x, y: end.y, z: end.z - z });
        add(t, true, () => true,
            p => ({ x: (p.x - x) / BALL_RADIUS, y: p.y / BALL_RADIUS, z: (p.z - z) / BALL_RADIUS }));
    }
    return first;
}
function bounceBall(ball, contact) {
    const impact = Math.abs(ball.vy);
    ball.x = contact.x;
    ball.y = contact.y + 1e-7;
    ball.z = contact.z;
    ball.vy = impact * clamp(0.86 - ball.topspin * 0.006, 0.72, 0.96) * (0.65 + 0.35 * contact.normal.y);
    ball.vx += ball.spin * Math.sign(ball.vz) * 0.045 + contact.normal.x * impact * 0.35;
    ball.vz = ball.vz * clamp(0.97 + ball.topspin * 0.016, 0.7, 1.25) + contact.normal.z * impact * 0.35;
    ball.spin *= 0.76;
    ball.topspin *= 0.64;
    limitBallSpeed(ball);
}
function ellipseEntry(start, end) {
    const c = start.x ** 2 + start.y ** 2 - 1;
    if (c <= 0) return 0;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const a = dx ** 2 + dy ** 2;
    if (a < 1e-12) return null;
    const b = 2 * (start.x * dx + start.y * dy);
    const discriminant = b ** 2 - 4 * a * c;
    if (discriminant < 0) return null;
    const entry = (-b - Math.sqrt(discriminant)) / (2 * a);
    return entry >= 0 && entry <= 1 ? entry : null;
}
class MatchEngine {
    playerPaddle = {
        x: 0,
        y: 0.24,
        vx: 0,
        vy: 0
    };
    opponentPaddle = {
        x: 0,
        y: 0.25,
        vx: 0,
        vy: 0
    };
    ball = {
        x: 0,
        y: 0.3,
        z: 0.6,
        vx: 0,
        vy: 0,
        vz: 0,
        spin: 0,
        topspin: 0,
        active: false
    };
    playerScore = 0;
    opponentScore = 0;
    totalPoints = 0;
    server = "player";
    waitingForServe = true;
    openingServer;
    difficulty;
    opponentStyle;
    rng;
    bouncesSinceHit = 0;
    lastHitter = "player";
    aiReactionClock = 0;
    aiTarget = {
        x: 0,
        y: 0.24
    };
    court = new CourtGeometry();
    courtRevision = 0;
    playerStrokeSegments = [];
    playerStrokeVelocity = { x: 0, y: 0 };
    playerMotionAge = 1;
    constructor(difficulty, opponentStyle, roundPressure = 0, rng = Math.random){
        this.difficulty = {
            ...difficulty,
            reaction: Math.max(0.035, difficulty.reaction - roundPressure * 0.015),
            moveSpeed: difficulty.moveSpeed + roundPressure * 0.24,
            returnChance: Math.min(0.995, difficulty.returnChance + roundPressure * 0.012),
            shotSpeed: difficulty.shotSpeed + roundPressure * 0.16
        };
        this.opponentStyle = opponentStyle;
        this.rng = rng;
        this.openingServer = rng() > 0.5 ? "player" : "opponent";
        this.server = this.openingServer;
    }
    setPlayerPaddle(x, y, elapsedSeconds) {
        if (![x, y, elapsedSeconds].every(Number.isFinite) || elapsedSeconds < 0) return;
        this.syncCourt();
        const startVelocity = { vx: this.playerPaddle.vx, vy: this.playerPaddle.vy };
        const dt = Math.max(1 / 1000, elapsedSeconds);
        const { x: nextX, y: nextY } = this.court.clampPaddle(x, y);
        const { x: rawVx, y: rawVy } = this.court.strokeVelocity(nextX - this.playerPaddle.x, nextY - this.playerPaddle.y, dt);
        const rawSpeed = Math.hypot(rawVx, rawVy);
        const blend = 1 - Math.exp(-dt / 0.014);
        const previousWeight = this.playerMotionAge > 0.12 ? 0 : 1 - blend;
        // Smooth strength, but follow the actual brush direction immediately.
        // Averaging signed velocities makes a reversal briefly spin the wrong way.
        const speed = Math.min(rawSpeed, Math.hypot(this.playerStrokeVelocity.x, this.playerStrokeVelocity.y) * previousWeight
            + Math.min(MAX_STROKE_SPEED, rawSpeed) * blend);
        if (rawSpeed > 0.001) {
            this.playerStrokeVelocity.x = rawVx / rawSpeed * speed;
            this.playerStrokeVelocity.y = rawVy / rawSpeed * speed;
        } else {
            this.playerStrokeVelocity.x *= previousWeight;
            this.playerStrokeVelocity.y *= previousWeight;
        }
        this.playerPaddle.vx = this.playerStrokeVelocity.x;
        this.playerPaddle.vy = this.playerStrokeVelocity.y;
        this.playerMotionAge = 0;
        this.playerStrokeSegments.push({
            start: { x: this.playerPaddle.x, y: this.playerPaddle.y },
            end: { x: nextX, y: nextY },
            duration: Math.min(dt, 0.1),
            startVelocity,
            vx: this.playerPaddle.vx,
            vy: this.playerPaddle.vy
        });
        this.playerPaddle.x = nextX;
        this.playerPaddle.y = nextY;
    }
    resetPlayerStroke() {
        this.playerStrokeVelocity.x = 0;
        this.playerStrokeVelocity.y = 0;
        this.playerPaddle.vx = 0;
        this.playerPaddle.vy = 0;
        this.playerMotionAge = 1;
        this.playerStrokeSegments = [];
    }
    placePlayerPaddle(x, y) {
        if (![x, y].every(Number.isFinite)) return;
        this.courtRevision = this.court.revision;
        Object.assign(this.playerPaddle, this.court.clampPaddle(x, y));
        this.resetPlayerStroke();
    }
    syncCourt() {
        if (this.courtRevision !== this.court.revision) this.placePlayerPaddle(this.playerPaddle.x, this.playerPaddle.y);
    }
    serve() {
        if (!this.waitingForServe) return;
        this.waitingForServe = false;
        this.ball.active = true;
        this.bouncesSinceHit = 0;
        this.lastHitter = this.server;
        const fromPlayer = this.server === "player";
        const paddle = fromPlayer ? this.playerPaddle : this.opponentPaddle;
        this.ball.x = paddle.x * 0.45;
        this.ball.y = 0.19;
        this.ball.z = fromPlayer ? 0.53 : TABLE_LENGTH - 0.53;
        this.ball.vx = (this.rng() - 0.5) * 0.28;
        this.ball.vy = 1.65;
        this.ball.vz = fromPlayer ? 3.55 : -3.55;
        this.ball.spin = 0;
        this.ball.topspin = 0;
        this.resetPlayerStroke();
    }
    update(dt) {
        if (!Number.isFinite(dt) || dt <= 0) return [];
        this.syncCourt();
        // Split at input samples as well as physics steps; never replace a curved
        // swipe with the straight chord between its first and last positions.
        const events = [];
        const duration = Math.min(dt, 0.1);
        const segments = this.playerStrokeSegments;
        this.playerStrokeSegments = [];
        const sampledDuration = segments.reduce((sum, segment) => sum + segment.duration, 0);
        const scale = Math.min(1, duration / Math.max(sampledDuration, 0.001));
        let time = 0;
        const advance = (length, segment = null) => {
            let elapsed = 0;
            while (elapsed < length - 1e-9) {
                const step = Math.min(length - elapsed, 1 / 240);
                const motion = segment ? {
                    start: interpolate(segment.start, segment.end, elapsed / length),
                    end: interpolate(segment.start, segment.end, (elapsed + step) / length),
                    vx: segment.vx, vy: segment.vy
                } : null;
                events.push(...this.updateStep(step, motion));
                elapsed += step;
                time += step;
            }
        };
        const idle = Math.max(0, duration - sampledDuration * scale);
        if (segments.length && idle > 0) {
            advance(idle, { start: segments[0].start, end: segments[0].start, ...segments[0].startVelocity });
        }
        for (const segment of segments) advance(segment.duration * scale, segment);
        if (time < duration - 1e-9) advance(duration - time);
        return events;
    }
    updateStep(dt, motion = null) {
        const events = [];
        try {
            this.updateAI(dt);
            if (!this.ball.active) return events;
            const previous = {
                x: this.ball.x,
                y: this.ball.y,
                z: this.ball.z
            };
            advanceBall(this.ball, dt);
            const crossedNet = previous.z < NET_Z && this.ball.z >= NET_Z || previous.z > NET_Z && this.ball.z <= NET_Z;
            const netHeight = crossedNet ? previous.y + (this.ball.y - previous.y) * (NET_Z - previous.z) / (this.ball.z - previous.z) : Infinity;
            if (netHeight <= NET_HEIGHT + BALL_RADIUS) {
                this.awardPoint(opposite(this.lastHitter), "net", events);
                return events;
            }
            if (this.tryPaddleContact(previous, "player", events, motion) || this.tryPaddleContact(previous, "opponent", events)) {
                return events;
            }
            const table = tableContact(previous, this.ball);
            if (table) {
                const bounceSide = table.z < NET_Z ? "player" : "opponent";
                const expectedSide = opposite(this.lastHitter);
                if (this.bouncesSinceHit === 0 && bounceSide !== expectedSide) {
                    this.awardPoint(opposite(this.lastHitter), "wrong side", events);
                    return events;
                }
                bounceBall(this.ball, table);
                this.bouncesSinceHit += 1;
                events.push({
                    type: "table",
                    side: bounceSide,
                    edge: table.edge,
                    position: { x: table.x, y: table.y, z: table.z }
                });
                if (this.bouncesSinceHit >= 2) {
                    this.awardPoint(this.lastHitter, "second bounce", events);
                    return events;
                }
            }
            const beyondEnd = this.ball.z < -0.24 || this.ball.z > TABLE_LENGTH + 0.24;
            if (beyondEnd || this.ball.y < 0 && !table) {
                const legalBounce = this.bouncesSinceHit > 0;
                this.awardPoint(legalBounce ? this.lastHitter : opposite(this.lastHitter),
                    legalBounce ? "missed return" : beyondEnd ? "long" : "wide", events);
            }
            return events;
        } finally{
            this.playerMotionAge += dt;
            const retained = Math.exp(-Math.max(0, this.playerMotionAge - 0.025) / 0.045);
            this.playerPaddle.vx = this.playerStrokeVelocity.x * retained;
            this.playerPaddle.vy = this.playerStrokeVelocity.y * retained;
        }
    }
    playerContact(previous, motion) {
        if (this.ball.z > NET_Z || this.ball.z < -0.24) return null;
        const stroke = motion ?? { start: this.playerPaddle, end: this.playerPaddle, vx: this.playerPaddle.vx, vy: this.playerPaddle.vy };
        const shape = this.court.paddleShape(PLAYER_PLANE, stroke.vx, stroke.start.x);
        const radius = Math.max(this.court.ballRadius(previous), this.court.ballRadius(this.ball));
        const cosine = Math.cos(shape.angle);
        const sine = Math.sin(shape.angle);
        const relative = (ball, paddle) => {
            const b = this.court.project(ball);
            const p = this.court.project({ ...paddle, z: PLAYER_PLANE });
            const dx = b.x - p.x;
            const dy = b.y - p.y;
            // Ball radius plus a two-pixel edge allowance around the drawn face.
            return { x: (dx * cosine + dy * sine) / (shape.x + radius + 2), y: (-dx * sine + dy * cosine) / (shape.y + radius + 2) };
        };
        const amount = ellipseEntry(relative(previous, stroke.start), relative(this.ball, stroke.end));
        if (amount === null) return null;
        const ballAtContact = { ...interpolate(previous, this.ball, amount), z: previous.z + (this.ball.z - previous.z) * amount };
        const offsetX = relative(ballAtContact, interpolate(stroke.start, stroke.end, amount)).x;
        return { amount, stroke: { ...stroke, offsetX: clamp(offsetX, -1, 1) } };
    }
    tryPaddleContact(previous, side, events, motion = null) {
        if (this.bouncesSinceHit !== 1) return false;
        const isPlayer = side === "player";
        const plane = isPlayer ? PLAYER_PLANE : OPPONENT_PLANE;
        const approaching = isPlayer ? this.ball.vz < 0 : this.ball.vz > 0;
        const crossed = isPlayer ? previous.z > plane && this.ball.z <= plane : previous.z < plane && this.ball.z >= plane;
        const opponentInReach = !isPlayer && this.ball.z >= OPPONENT_PLANE - 0.12 && this.ball.z <= TABLE_LENGTH + 0.2;
        if (!approaching || !isPlayer && !crossed && !opponentInReach) return false;
        const contact = isPlayer ? this.playerContact(previous, motion) : null;
        if (isPlayer && !contact) return false;
        if (!isPlayer && (Math.abs(this.ball.x - this.opponentPaddle.x) > 0.185 || Math.abs(this.ball.y - this.opponentPaddle.y) > 0.17)) return false;
        if (!isPlayer && this.rng() > this.difficulty.returnChance) return false;
        if (contact) {
            const z = previous.z + (this.ball.z - previous.z) * contact.amount;
            Object.assign(this.ball, interpolate(previous, this.ball, contact.amount), { z });
        }
        const position = { x: this.ball.x, y: this.ball.y, z: this.ball.z };
        const shot = isPlayer ? this.playerReturn(contact.stroke) : this.opponentReturn();
        this.bouncesSinceHit = 0;
        this.lastHitter = side;
        const power = shot?.power ?? 0.75 + this.difficulty.shotSpeed * 0.15;
        events.push({
            type: "paddle",
            side,
            power,
            position,
            speed: Math.hypot(this.ball.vx, this.ball.vy, this.ball.vz),
            spin: this.ball.spin,
            topspin: this.ball.topspin,
            shot: shot?.name
        });
        return true;
    }
    playerReturn(stroke = this.playerPaddle) {
        const { vx, vy } = stroke;
        const strokeSpeed = Math.hypot(vx, vy);
        const strength = Math.pow(clamp((strokeSpeed - 0.18) / 7.5, 0, 1), 0.85);
        const directionX = strokeSpeed > 0 ? vx / strokeSpeed : 0;
        const directionY = strokeSpeed > 0 ? vy / strokeSpeed : 0;
        const drive = Math.max(0, directionY);
        const cut = Math.max(0, -directionY);
        const drivePower = strokePower(vy);
        const cutPower = strokePower(-vy);
        const incomingPace = Math.hypot(this.ball.vx, this.ball.vz);
        const blockPace = clamp(2.95 + incomingPace * 0.1, 3.2, 3.65);
        // Forward motion supplies power; lateral motion supplies aim and brush.
        // Keep these separate so a sideways bash cannot also become a smash.
        const pace = Math.min(MAX_RETURN_PACE, blockPace + drivePower * 2.1 - cutPower * 0.4);
        const spinStrength = MAX_SPIN * Math.pow(strength, 0.9);
        const retainedSpin = 0.15 * (1 - strength * 0.65);
        // Ordinary placement strokes stay flat. Sidespin needs a deliberate
        // lateral brush, then ramps continuously instead of switching to full spin.
        const sideBrush = Math.pow(clamp((Math.abs(vx) - 2.5) / 5.5, 0, 1), 1.3);
        const spin = Math.sign(vx) * MAX_SPIN * sideBrush * (1 - drivePower * 0.85) + this.ball.spin * retainedSpin;
        const topspin = directionY * spinStrength - this.ball.topspin * retainedSpin;
        const landingZ = 2.0 + strength * (0.52 + drive * 0.2 - cut * 0.5);
        // The aim limit is outside the table: controlled placement can catch a
        // line, while an outward swipe from a wide contact can go out.
        const targetX = clamp(this.ball.x * 0.8 + clamp(vx / 8, -1, 1) * 0.53
            + (stroke.offsetX ?? 0) * 0.09, -1.15, 1.15);
        this.launchReturn(targetX, landingZ, pace, spin, topspin);
        let name = strength < 0.04 ? "Block" : "Drive";
        if (Math.abs(this.ball.spin) >= 1) name = this.ball.spin < 0 ? "Left sidespin" : "Right sidespin";
        if (Math.abs(this.ball.topspin) >= 1) {
            const verticalName = this.ball.topspin > 0 ? "Topspin" : "Backspin";
            name = Math.abs(this.ball.spin) >= 1 ? `${verticalName} + sidespin` : verticalName;
        }
        if (drive > 0.85 && strength > 0.72 && this.ball.y > 0.23) name = "Topspin smash";
        return { power: 0.7 + clamp((Math.abs(this.ball.vz) - 3.2) / (MAX_RETURN_PACE - 3.2), 0, 1) * 1.1, name };
    }
    launchReturn(targetX, targetZ, requestedPace, spin, topspin) {
        const spinLimit = Math.min(1, MAX_SPIN / Math.max(0.001, Math.hypot(spin, topspin)));
        this.ball.spin = spin * spinLimit;
        this.ball.topspin = topspin * spinLimit;
        const direction = Math.sign(targetZ - this.ball.z);
        let pace = clamp(requestedPace, 2, MAX_RETURN_PACE);
        let landingZ = targetZ;
        let flightTime;
        let lift;
        // Keep the arcade net assistance, but respect the space available. Low,
        // early contact needs a slower arc; a high ball permits a fast smash.
        for (let attempt = 0; attempt < 24; attempt++) {
            flightTime = Math.abs(landingZ - this.ball.z) / pace;
            const netTime = Math.max(0.0001, Math.abs(NET_Z - this.ball.z) / pace);
            lift = (BALL_RADIUS - this.ball.y + 0.5 * GRAVITY * flightTime ** 2
                + spinDisplacement(this.ball.topspin, pace, flightTime, TOP_SPIN_ACCELERATION)) / flightTime;
            const heightAtNet = this.ball.y + lift * netTime - 0.5 * GRAVITY * netTime ** 2
                - spinDisplacement(this.ball.topspin, pace, netTime, TOP_SPIN_ACCELERATION);
            const aimVelocity = (targetX - this.ball.x - spinDisplacement(this.ball.spin, direction * pace, flightTime, SIDE_SPIN_ACCELERATION)) / flightTime;
            if (Math.hypot(aimVelocity, lift, pace) > MAX_BALL_SPEED && attempt < 23) {
                pace *= 0.94;
                continue;
            }
            if (heightAtNet >= NET_HEIGHT + BALL_RADIUS + 0.035) break;
            const deeperZ = direction > 0 ? Math.max(landingZ, Math.min(landingZ + 0.12, TABLE_LENGTH - 0.1))
                : Math.min(landingZ, Math.max(landingZ - 0.12, 0.1));
            if (Math.abs(deeperZ - landingZ) > 0.001) landingZ = deeperZ;
            else if (attempt < 23) pace *= 0.88;
        }
        this.ball.vz = direction * pace;
        this.ball.vy = lift;
        // Compensate initial aim for the curved flight so a strong slice can
        // still land near the sideline instead of automatically sailing wide.
        this.ball.vx = (targetX - this.ball.x
            - spinDisplacement(this.ball.spin, this.ball.vz, flightTime, SIDE_SPIN_ACCELERATION)) / flightTime;
        limitBallSpeed(this.ball);
    }
    opponentReturn() {
        const anticipatesPlayer = this.playerPaddle.x > 0 ? -1 : 1;
        const styleBias = this.opponentStyle === "angle" ? 1 : this.opponentStyle === "counter" ? 0.62 : 0.8;
        const targetX = clamp(anticipatesPlayer * this.difficulty.anticipation * styleBias * TABLE_HALF_WIDTH + (this.rng() - 0.5) * this.difficulty.aimError * 2, -TABLE_HALF_WIDTH * 0.92, TABLE_HALF_WIDTH * 0.92);
        const smashBoost = this.opponentStyle === "smash" && this.ball.y > 0.28 ? 0.75 : 0;
        const speed = this.difficulty.shotSpeed + smashBoost;
        const spinner = this.opponentStyle === "spinner";
        const spin = anticipatesPlayer * this.difficulty.spin * (spinner ? 10 : 3.5) + this.ball.spin * 0.12;
        const topspin = smashBoost ? this.difficulty.spin * 8 : spinner
            ? this.difficulty.spin * (this.rng() < 0.5 ? -7 : 7) : -this.ball.topspin * 0.15;
        const targetZ = topspin < -1 ? 0.72 : 0.4;
        this.launchReturn(targetX, targetZ, speed, spin, topspin);
    }
    predictOpponentArrival() {
        const predicted = { ...this.ball };
        let bounces = this.bouncesSinceHit;
        // Forecast with the same capped flight, finite-table contact, and spin
        // kick used in play. A straight pre-bounce projection misreads hard slices.
        for (let step = 0; step < 240; step++) {
            const previous = { x: predicted.x, y: predicted.y, z: predicted.z };
            advanceBall(predicted, 1 / 120);
            const table = tableContact(previous, predicted);
            if (table) { bounceBall(predicted, table); bounces++; }
            if (bounces === 1 && predicted.z >= OPPONENT_PLANE) {
                const amount = previous.z < OPPONENT_PLANE ? (OPPONENT_PLANE - previous.z) / Math.max(1e-9, predicted.z - previous.z) : 1;
                return interpolate(previous, predicted, amount);
            }
            if (bounces > 1 || predicted.y < 0 || predicted.z > TABLE_LENGTH + 0.2) return null;
        }
        return null;
    }
    updateAI(dt) {
        this.aiReactionClock += dt;
        if (this.ball.active && this.ball.vz > 0 && this.aiReactionClock >= this.difficulty.reaction) {
            this.aiReactionClock = 0;
            const arrival = this.predictOpponentArrival() ?? this.ball;
            const forecast = this.difficulty.anticipation;
            const predictedX = this.ball.x + (arrival.x - this.ball.x) * forecast;
            const predictedY = arrival.y;
            this.aiTarget.x = clamp(predictedX + (this.rng() - 0.5) * this.difficulty.aimError, -0.83, 0.83);
            this.aiTarget.y = clamp(predictedY, 0.08, 0.68);
        }
        const previousX = this.opponentPaddle.x;
        const previousY = this.opponentPaddle.y;
        this.opponentPaddle.x = moveToward(this.opponentPaddle.x, this.aiTarget.x, this.difficulty.moveSpeed * dt);
        this.opponentPaddle.y = moveToward(this.opponentPaddle.y, this.aiTarget.y, this.difficulty.moveSpeed * 0.72 * dt);
        this.opponentPaddle.vx = (this.opponentPaddle.x - previousX) / Math.max(dt, 0.001);
        this.opponentPaddle.vy = (this.opponentPaddle.y - previousY) / Math.max(dt, 0.001);
    }
    awardPoint(scorer, reason, events) {
        if (!this.ball.active) return;
        this.ball.active = false;
        if (scorer === "player") this.playerScore += 1;
        else this.opponentScore += 1;
        this.totalPoints += 1;
        events.push({
            type: "point",
            scorer,
            reason
        });
        if (hasWonGame(this.playerScore, this.opponentScore)) {
            events.push({
                type: "game",
                winner: this.playerScore > this.opponentScore ? "player" : "opponent"
            });
            this.waitingForServe = false;
            return;
        }
        this.server = serverForPoint(this.totalPoints, this.openingServer);
        this.waitingForServe = true;
    }
}

Object.assign(window.RallyEleven, { TABLE_LENGTH, TABLE_HALF_WIDTH, NET_Z, NET_HEIGHT, BALL_RADIUS, PLAYER_PLANE, MAX_RETURN_PACE, MAX_BALL_SPEED, MatchEngine });
})();
