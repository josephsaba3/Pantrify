// Plain browser JavaScript. Loaded in order by the HTML page.
(() => {
"use strict";
window.RallyEleven ??= {};
function opposite(side) {
    return side === "player" ? "opponent" : "player";
}
function hasWonGame(playerScore, opponentScore, target = 11) {
    return Math.max(playerScore, opponentScore) >= target && Math.abs(playerScore - opponentScore) >= 2;
}
function serverForPoint(totalPointsPlayed, openingServer) {
    const serviceBlock = totalPointsPlayed >= 20 ? totalPointsPlayed - 20 : Math.floor(totalPointsPlayed / 2);
    const switches = totalPointsPlayed >= 20 ? 10 + serviceBlock : serviceBlock;
    return switches % 2 === 0 ? openingServer : opposite(openingServer);
}

Object.assign(window.RallyEleven, { opposite, hasWonGame, serverForPoint });
})();
