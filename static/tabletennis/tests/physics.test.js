// Plain browser JavaScript. Loaded in order by the HTML page.
(() => {
"use strict";
window.RallyEleven ??= {};
const { assert, describe, it } = window.BrowserTests;
const { getDifficulty } = window.RallyEleven;
const { MatchEngine } = window.RallyEleven;
describe("player paddle contact", ()=>{
    it("registers a fast swipe whose path crosses the incoming ball", ()=>{
        const engine = new MatchEngine(getDifficulty("club"), "counter", 0, ()=>0);
        engine.setPlayerPaddle(-0.78, 0.2, 1 / 60);
        engine.serve();
        let playerReturned = false;
        let armedSwipe = false;
        for(let frame = 0; frame < 240 && engine.ball.active; frame += 1){
            if (engine.ball.vz < 0 && engine.ball.z < 0.3 && !armedSwipe) {
                engine.setPlayerPaddle(-0.78, engine.ball.y, 1 / 60);
                engine.update(1 / 120);
                engine.setPlayerPaddle(0.78, engine.ball.y, 1 / 120);
                armedSwipe = true;
            }
            const events = engine.update(1 / 120);
            if (events.some((event)=>event.type === "paddle" && event.side === "player")) {
                playerReturned = true;
                break;
            }
        }
        assert.equal(playerReturned, true);
        assert.ok(engine.ball.vz > 0, "the return should travel toward the opponent");
    });
});
})();
