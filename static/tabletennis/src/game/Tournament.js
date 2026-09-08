// Plain browser JavaScript. Loaded in order by the HTML page.
(() => {
"use strict";
window.RallyEleven ??= {};
const PLAYER = {
    id: "player",
    name: "You",
    code: "YOU",
    seed: 1,
    rating: 88,
    color: "#ff5a36",
    style: "counter"
};
const OPPONENTS = [
    {
        id: "mori",
        name: "Aiko Mori",
        code: "MOR",
        rating: 91,
        color: "#e9bd4b",
        style: "spinner"
    },
    {
        id: "vega",
        name: "Luz Vega",
        code: "VEG",
        rating: 86,
        color: "#e05b82",
        style: "angle"
    },
    {
        id: "okafor",
        name: "Nia Okafor",
        code: "OKA",
        rating: 89,
        color: "#54c79b",
        style: "smash"
    },
    {
        id: "rhee",
        name: "Min Rhee",
        code: "RHE",
        rating: 84,
        color: "#67b7e5",
        style: "counter"
    },
    {
        id: "novak",
        name: "Tomas Novak",
        code: "NOV",
        rating: 82,
        color: "#c6a3e8",
        style: "wall"
    },
    {
        id: "santos",
        name: "Ivo Santos",
        code: "SAN",
        rating: 79,
        color: "#f0964f",
        style: "angle"
    },
    {
        id: "carter",
        name: "Maya Carter",
        code: "CAR",
        rating: 76,
        color: "#8fc85b",
        style: "smash"
    }
];
function seededScore(rng) {
    const loser = Math.floor(rng() * 9);
    return `11–${loser}`;
}
class Tournament {
    difficultyId;
    competitors;
    matches;
    status;
    rng;
    constructor(difficultyId, rng = Math.random, snapshot){
        this.rng = rng;
        if (snapshot) {
            this.difficultyId = snapshot.difficultyId;
            this.competitors = snapshot.competitors;
            this.matches = snapshot.matches;
            this.status = snapshot.status;
            return;
        }
        this.difficultyId = difficultyId;
        this.competitors = [
            PLAYER,
            ...OPPONENTS.map((opponent, index)=>({
                    ...opponent,
                    seed: index + 2
                }))
        ];
        this.status = "active";
        this.matches = [
            this.makeMatch("qf-1", "Quarterfinal", 0, "player", "carter"),
            this.makeMatch("qf-2", "Quarterfinal", 1, "rhee", "novak"),
            this.makeMatch("qf-3", "Quarterfinal", 2, "vega", "santos"),
            this.makeMatch("qf-4", "Quarterfinal", 3, "okafor", "mori")
        ];
        this.simulateMatch(this.matches[1]);
        this.simulateMatch(this.matches[2]);
        this.simulateMatch(this.matches[3]);
    }
    static fromSnapshot(snapshot, rng = Math.random) {
        return new Tournament(snapshot.difficultyId, rng, snapshot);
    }
    makeMatch(id, round, order, a, b) {
        return {
            id,
            round,
            order,
            a,
            b
        };
    }
    competitor(id) {
        const found = this.competitors.find((competitor)=>competitor.id === id);
        if (!found) throw new Error(`Unknown competitor: ${id}`);
        return found;
    }
    simulateMatch(match) {
        const a = this.competitor(match.a);
        const b = this.competitor(match.b);
        const chanceA = a.rating / (a.rating + b.rating);
        match.winnerId = this.rng() < chanceA ? a.id : b.id;
        match.score = seededScore(this.rng);
    }
    getRounds() {
        return {
            Quarterfinal: this.matches.filter((match)=>match.round === "Quarterfinal"),
            Semifinal: this.matches.filter((match)=>match.round === "Semifinal"),
            Final: this.matches.filter((match)=>match.round === "Final")
        };
    }
    getCurrentPlayerMatch() {
        return this.matches.find((match)=>!match.winnerId && (match.a === PLAYER.id || match.b === PLAYER.id));
    }
    getOpponent(match) {
        return this.competitor(match.a === PLAYER.id ? match.b : match.a);
    }
    recordPlayerResult(won, playerScore, opponentScore) {
        const match = this.getCurrentPlayerMatch();
        if (!match) throw new Error("No active player match");
        const opponent = this.getOpponent(match);
        match.winnerId = won ? PLAYER.id : opponent.id;
        match.score = won ? `${playerScore}–${opponentScore}` : `${opponentScore}–${playerScore}`;
        if (!won) {
            this.status = "eliminated";
            return;
        }
        if (match.round === "Final") {
            this.status = "champion";
            return;
        }
        this.buildNextRound(match.round);
    }
    buildNextRound(completedRound) {
        if (completedRound === "Quarterfinal") {
            const quarterfinals = this.getRounds().Quarterfinal;
            if (quarterfinals.some((match)=>!match.winnerId)) return;
            const semifinals = [
                this.makeMatch("sf-1", "Semifinal", 0, quarterfinals[0].winnerId, quarterfinals[1].winnerId),
                this.makeMatch("sf-2", "Semifinal", 1, quarterfinals[2].winnerId, quarterfinals[3].winnerId)
            ];
            this.matches.push(...semifinals);
            const nonPlayerSemifinal = semifinals.find((match)=>match.a !== PLAYER.id && match.b !== PLAYER.id);
            if (nonPlayerSemifinal) this.simulateMatch(nonPlayerSemifinal);
            return;
        }
        const semifinals = this.getRounds().Semifinal;
        if (semifinals.some((match)=>!match.winnerId)) return;
        this.matches.push(this.makeMatch("final", "Final", 0, semifinals[0].winnerId, semifinals[1].winnerId));
    }
    serialize() {
        return {
            difficultyId: this.difficultyId,
            competitors: this.competitors,
            matches: this.matches,
            status: this.status
        };
    }
}

Object.assign(window.RallyEleven, { Tournament });
})();
