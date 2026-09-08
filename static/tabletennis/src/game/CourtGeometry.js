// One projection for drawing, pointer control, and player contact.
(() => {
"use strict";
window.RallyEleven ??= {};
const TABLE_LENGTH = 2.74;
const TABLE_HALF_WIDTH = 0.7625;
const NET_Z = TABLE_LENGTH / 2;
const NET_HEIGHT = 0.1525;
const BALL_RADIUS = 0.02;
const PLAYER_PLANE = 0.075;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
class CourtGeometry {
    width = 1440;
    height = 900;
    revision = 0;
    resize(width, height) {
        if (width === this.width && height === this.height) return;
        this.width = Math.max(1, width);
        this.height = Math.max(1, height);
        this.revision++;
    }
    cameraAtDepth(depth) {
        return {
            surfaceY: this.height * (0.82 - 0.46 * depth),
            halfWidth: this.width * (0.4 - 0.235 * depth) * 0.78,
            scale: (1 - 0.6 * depth) * 0.78
        };
    }
    project(point) {
        const camera = this.cameraAtDepth(clamp(point.z / TABLE_LENGTH, 0, 1));
        return {
            x: this.width / 2 + point.x / TABLE_HALF_WIDTH * camera.halfWidth,
            y: camera.surfaceY - point.y * this.height * 0.39 * camera.scale,
            scale: camera.scale
        };
    }
    paddleAtScreen(x, y) {
        const camera = this.cameraAtDepth(PLAYER_PLANE / TABLE_LENGTH);
        return {
            x: (x - this.width / 2) / camera.halfWidth * TABLE_HALF_WIDTH,
            y: (camera.surfaceY - y) / (this.height * 0.39 * camera.scale)
        };
    }
    paddleShape(z = PLAYER_PLANE, vx = 0, x = 0) {
        const scale = this.cameraAtDepth(clamp(z / TABLE_LENGTH, 0, 1)).scale;
        const radius = Math.max(13, Math.min(this.width * 0.065, this.height * 0.15) * scale);
        // Face the position on the court; a small correction should not flip the bat.
        return { x: radius * 0.82, y: radius, angle: clamp(x / TABLE_HALF_WIDTH * 0.42 + vx * 0.003, -0.55, 0.55) };
    }
    paddleBounds() {
        const shape = this.paddleShape();
        // Leave room for the tilted face and handle, with the score controls above.
        return {
            left: shape.y + 8,
            right: this.width - shape.y - 8,
            top: Math.max(this.height * 0.2, shape.y + 8),
            bottom: this.height - shape.y * 1.75 - 8
        };
    }
    screenToPaddle(x, y) {
        const bounds = this.paddleBounds();
        return this.paddleAtScreen(clamp(x, bounds.left, bounds.right), clamp(y, bounds.top, bounds.bottom));
    }
    pointerToPaddle(x, y, pointerType) {
        // Give mouse/trackpad aiming more travel per table width, without adding
        // follow lag. Touch keeps the face directly under the finger.
        if (pointerType === "mouse") x = this.width / 2 + (x - this.width / 2) * 0.72;
        return this.screenToPaddle(x, y);
    }
    clampPaddle(x, y) {
        const screen = this.project({ x, y, z: PLAYER_PLANE });
        return this.screenToPaddle(screen.x, screen.y);
    }
    strokeVelocity(dx, dy, dt) {
        const camera = this.cameraAtDepth(PLAYER_PLANE / TABLE_LENGTH);
        // Measure both axes against the same screen distance. A quarter-screen
        // brush has the same strength on a phone and desktop, in either direction.
        const scale = 1.55 / Math.min(this.width, this.height) / dt;
        return {
            x: dx / TABLE_HALF_WIDTH * camera.halfWidth * scale,
            y: dy * this.height * 0.39 * camera.scale * scale
        };
    }
    ballRadius(point) {
        return Math.max(3.2, BALL_RADIUS * this.width * 0.84 * this.project(point).scale);
    }
}
Object.assign(window.RallyEleven, { CourtGeometry, TABLE_LENGTH, TABLE_HALF_WIDTH, NET_Z, NET_HEIGHT, BALL_RADIUS, PLAYER_PLANE });
})();
