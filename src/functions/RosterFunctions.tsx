import { RatingKeys, SignedUpPlayer } from "../types/Player";
import { Criteria } from "../types/Criteria";
import { Rosters } from "../types/Rosters";

// How much each imbalance costs. Ratings are 1-3, so a weight of 1 per rating point.
const TotalRatingWeight = 2;
const DefenseWeight = 3;
const ReidarWeight = 10;
const Restarts = 200;
// Any split this close to the best one found is good enough; one of them is picked at random.
const CostTolerance = 1;

export interface TeamStats {
    Both: number;
    Defense: number;
    Forwards: number;
    Reidars: number;
}

const SortByName = (a: SignedUpPlayer, b: SignedUpPlayer) => a.Name.localeCompare(b.Name, "fi");

const Shuffle = <T,>(Items: T[], Random: () => number) => Items
    .map(item => ({ item, sort: Random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);

export const GetTeamStats = (Team: SignedUpPlayer[]): TeamStats => ({
    Both: Team.filter(player => player.Position === "B").length,
    Defense: Team.filter(player => player.Position === "D").length,
    Forwards: Team.filter(player => player.Position === "F").length,
    Reidars: Team.filter(player => player.IsReidar).length
});

// IsBlack[i] tells which team Pool[i] is on.
const GetCost = (Crit: Criteria, Pool: SignedUpPlayer[], IsBlack: boolean[], BlackSize: number) => {
    const ratingDiff: Record<string, number> = {};
    let totalDiff = 0;
    let defenseDiff = 0;
    let blackReidars = 0;
    let whiteReidars = 0;

    Pool.forEach(function (player, i) {
        const sign = IsBlack[i] ? 1 : -1;
        RatingKeys.forEach(function (key) {
            ratingDiff[key] = (ratingDiff[key] ?? 0) + sign * player.Ratings[key];
            totalDiff += sign * player.Ratings[key];
        });
        // A player who plays both counts as half a defenseman.
        defenseDiff += sign * (player.Position === "D" ? 1 : player.Position === "B" ? 0.5 : 0);
        if (player.IsReidar && IsBlack[i]) {
            blackReidars++;
        }
        else if (player.IsReidar) {
            whiteReidars++;
        }
    });

    let cost = RatingKeys.reduce((sum, key) => sum + Math.abs(ratingDiff[key]), 0)
        + TotalRatingWeight * Math.abs(totalDiff)
        + DefenseWeight * Math.abs(defenseDiff);

    if (Crit.ReidarMode === "even") {
        cost += ReidarWeight * Math.abs(blackReidars - whiteReidars);
    }
    else if (Crit.ReidarMode === "black") {
        const reidarsThatFit = Math.min(blackReidars + whiteReidars, BlackSize);
        cost += ReidarWeight * (reidarsThatFit - blackReidars);
    }

    return cost;
};

export const GenerateRoster = (Crit: Criteria, Pool: SignedUpPlayer[], Random: () => number = Math.random): Rosters => {
    const blackSize = Math.ceil(Pool.length / 2);
    const whiteSize = Pool.length - blackSize;
    // Perma-whites are locked to white, as long as there is room.
    const lockedWhite = new Set(Pool.map((_, i) => i).filter(i => Pool[i].IsPermaWhite).slice(0, whiteSize));
    const candidates: { Cost: number; IsBlack: boolean[] }[] = [];
    const seen = new Set<string>();
    let bestCost = Infinity;

    for (let restart = 0; restart < Restarts; restart++) {
        const free = Shuffle(Pool.map((_, i) => i).filter(i => !lockedWhite.has(i)), Random);
        const isBlack = Pool.map(() => false);
        free.slice(0, blackSize).forEach(i => { isBlack[i] = true; });
        let cost = GetCost(Crit, Pool, isBlack, blackSize);

        // Swap a black and a white player whenever it helps, until no swap does.
        let improved = true;
        while (improved) {
            improved = false;
            const blacks = Shuffle(Pool.map((_, i) => i).filter(i => isBlack[i]), Random);
            const whites = Shuffle(Pool.map((_, i) => i).filter(i => !isBlack[i] && !lockedWhite.has(i)), Random);
            for (const b of blacks) {
                for (const w of whites) {
                    isBlack[b] = false;
                    isBlack[w] = true;
                    const swappedCost = GetCost(Crit, Pool, isBlack, blackSize);
                    if (swappedCost < cost) {
                        cost = swappedCost;
                        improved = true;
                        break;
                    }
                    isBlack[b] = true;
                    isBlack[w] = false;
                }
                if (improved) {
                    break;
                }
            }
        }

        const key = isBlack.map(value => value ? "1" : "0").join("");
        if (!seen.has(key)) {
            seen.add(key);
            candidates.push({ Cost: cost, IsBlack: isBlack });
            bestCost = Math.min(bestCost, cost);
        }
    }

    const goodEnough = candidates.filter(candidate => candidate.Cost <= bestCost + CostTolerance);
    const chosen = goodEnough[Math.floor(Random() * goodEnough.length)];

    return {
        Black: Pool.filter((_, i) => chosen.IsBlack[i]).sort(SortByName),
        White: Pool.filter((_, i) => !chosen.IsBlack[i]).sort(SortByName)
    };
};
