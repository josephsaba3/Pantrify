// Plain browser JavaScript. Loaded in order by the HTML page.
(() => {
"use strict";
window.RallyEleven ??= {};
const { assert, describe, it } = window.BrowserTests;
const { DIFFICULTIES } = window.RallyEleven;
describe("difficulty curve", ()=>{
    it("makes every successive opponent faster and more reliable", ()=>{
        for(let index = 1; index < DIFFICULTIES.length; index += 1){
            const previous = DIFFICULTIES[index - 1];
            const current = DIFFICULTIES[index];
            assert.ok(current.reaction < previous.reaction);
            assert.ok(current.moveSpeed > previous.moveSpeed);
            assert.ok(current.returnChance > previous.returnChance);
            assert.ok(current.shotSpeed > previous.shotSpeed);
            assert.ok(current.aimError < previous.aimError);
            assert.ok(current.anticipation > previous.anticipation);
        }
    });
});
})();
