// Plain browser JavaScript. Loaded in order by the HTML page.
(() => {
"use strict";
window.RallyEleven ??= {};
const DIFFICULTIES = [
    {
        id: "rookie",
        label: "Rookie",
        description: "Slower reads and forgiving placement.",
        reaction: 0.3,
        moveSpeed: 2.1,
        aimError: 0.24,
        returnChance: 0.78,
        shotSpeed: 3.55,
        spin: 0.18,
        anticipation: 0.28
    },
    {
        id: "club",
        label: "Club",
        description: "Reliable rallies with varied returns.",
        reaction: 0.2,
        moveSpeed: 2.85,
        aimError: 0.14,
        returnChance: 0.87,
        shotSpeed: 3.9,
        spin: 0.34,
        anticipation: 0.5
    },
    {
        id: "pro",
        label: "Pro",
        description: "Reads your position and attacks space.",
        reaction: 0.115,
        moveSpeed: 3.65,
        aimError: 0.07,
        returnChance: 0.94,
        shotSpeed: 4.25,
        spin: 0.58,
        anticipation: 0.74
    },
    {
        id: "legend",
        label: "Legend",
        description: "Fast anticipation, heavy spin, no charity.",
        reaction: 0.055,
        moveSpeed: 4.55,
        aimError: 0.025,
        returnChance: 0.985,
        shotSpeed: 4.7,
        spin: 0.82,
        anticipation: 0.94
    }
];
function getDifficulty(id) {
    return DIFFICULTIES.find((difficulty)=>difficulty.id === id) ?? DIFFICULTIES[1];
}

Object.assign(window.RallyEleven, { DIFFICULTIES, getDifficulty });
})();
