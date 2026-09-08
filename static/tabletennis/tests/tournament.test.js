// Plain browser JavaScript. Loaded in order by the HTML page.
(() => {
"use strict";
window.RallyEleven ??= {};
const { assert, describe, it } = window.BrowserTests;
const { Tournament } = window.RallyEleven;
describe("knockout tournament", ()=>{
    it("creates a complete eight-player quarterfinal draw", ()=>{
        const tournament = new Tournament("club", ()=>0.2);
        assert.equal(tournament.competitors.length, 8);
        assert.equal(tournament.getRounds().Quarterfinal.length, 4);
        assert.equal(tournament.getCurrentPlayerMatch()?.round, "Quarterfinal");
    });
    it("advances the player through semifinal and final", ()=>{
        const tournament = new Tournament("pro", ()=>0.2);
        tournament.recordPlayerResult(true, 11, 7);
        assert.equal(tournament.getCurrentPlayerMatch()?.round, "Semifinal");
        tournament.recordPlayerResult(true, 12, 10);
        assert.equal(tournament.getCurrentPlayerMatch()?.round, "Final");
        tournament.recordPlayerResult(true, 11, 9);
        assert.equal(tournament.status, "champion");
    });
    it("ends the run immediately after a player loss", ()=>{
        const tournament = new Tournament("legend", ()=>0.8);
        tournament.recordPlayerResult(false, 5, 11);
        assert.equal(tournament.status, "eliminated");
        assert.equal(tournament.getCurrentPlayerMatch(), undefined);
    });
});
})();
