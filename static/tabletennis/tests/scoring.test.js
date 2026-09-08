// Plain browser JavaScript. Loaded in order by the HTML page.
(() => {
"use strict";
window.RallyEleven ??= {};
const { assert, describe, it } = window.BrowserTests;
const { hasWonGame, serverForPoint } = window.RallyEleven;
describe("table-tennis scoring", ()=>{
    it("requires eleven points and a two-point margin", ()=>{
        assert.equal(hasWonGame(11, 9), true);
        assert.equal(hasWonGame(11, 10), false);
        assert.equal(hasWonGame(14, 12), true);
    });
    it("switches serve every two points before deuce", ()=>{
        assert.equal(serverForPoint(0, "player"), "player");
        assert.equal(serverForPoint(1, "player"), "player");
        assert.equal(serverForPoint(2, "player"), "opponent");
        assert.equal(serverForPoint(4, "player"), "player");
    });
    it("switches serve every point at deuce", ()=>{
        assert.equal(serverForPoint(20, "player"), "player");
        assert.equal(serverForPoint(21, "player"), "opponent");
        assert.equal(serverForPoint(22, "player"), "player");
    });
});
})();
