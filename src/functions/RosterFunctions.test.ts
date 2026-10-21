import { describe, expect, test } from "vitest";
import { GenerateRoster, GetTeamStats } from "./RosterFunctions";
import { ParseSignups } from "./ParseFunctions";
import { Player, SignedUpPlayer } from "../types/Player";
import Seed from "../../public/api/data/players.seed.json";

const Players = Seed as Player[];

const SamplePaste = "Tuomas Peter M Sakke K Jani H Sami H Jesse O Jussi L (MV) Teemu L Olli-Pekka M Ville Hyötylä Jukka S (mv) Jori P Petro R Olli H Aki S Juuso K Vinkka Luka Huotari Aatu ylinampa Mube Joonas Salminen Kimmo P";

// Small deterministic random generator so test runs repeat.
const SeededRandom = (Seed: number) => () => {
    Seed = (Seed * 1664525 + 1013904223) % 4294967296;
    return Seed / 4294967296;
};

const MakePlayer = (Name: string, Position: "F" | "D" | "B", Rating: number, IsReidar = false): SignedUpPlayer => ({
    Aliases: [],
    Id: Name,
    IsGuest: false,
    IsPermaWhite: false,
    IsReidar,
    Name,
    Position,
    Ratings: { Offense: Rating, Defense: Rating, Speed: Rating, Skill: Rating, Grit: Rating }
});

describe("ParseSignups", () => {
    test("splits the sample Nimenhuuto paste into 22 names", () => {
        const entries = ParseSignups(SamplePaste, Players);
        expect(entries.map(entry => entry.Text)).toEqual([
            "Tuomas", "Peter M", "Sakke K", "Jani H", "Sami H", "Jesse O", "Jussi L", "Teemu L",
            "Olli-Pekka M", "Ville Hyötylä", "Jukka S", "Jori P", "Petro R", "Olli H", "Aki S", "Juuso K",
            "Vinkka", "Luka Huotari", "Aatu ylinampa", "Mube", "Joonas Salminen", "Kimmo P"
        ]);
        expect(entries.filter(entry => entry.IsGoalie).map(entry => entry.Text)).toEqual(["Jussi L", "Jukka S"]);
    });

    test("matches regulars by alias, initial and unique first name", () => {
        const entries = ParseSignups(SamplePaste, Players);
        const byText = Object.fromEntries(entries.map(entry => [entry.Text, entry]));
        expect(byText["Peter M"]).toMatchObject({ PlayerId: "peter-m", Match: "exact" });
        expect(byText["Ville Hyötylä"]).toMatchObject({ PlayerId: "ville-h", Match: "initial" });
        expect(byText["Tuomas"]).toMatchObject({ PlayerId: "tuomas-v", Match: "firstname" });
        expect(byText["Sami H"]).toMatchObject({ PlayerId: null, Match: "none" });
    });

    test("uses aliases and treats line breaks as name boundaries", () => {
        const players: Player[] = [{ ...Players[0], Aliases: ["Akke"] }];
        const entries = ParseSignups("Akke Pekka Koskinen\nVinkka\nKoskinen", players);
        expect(entries.map(entry => [entry.Text, entry.PlayerId])).toEqual([["Akke", "aki-s"], ["Pekka Koskinen", null], ["Vinkka", null], ["Koskinen", null]]);
    });
});

describe("GenerateRoster", () => {
    const pool: SignedUpPlayer[] = [
        MakePlayer("D1", "D", 3), MakePlayer("D2", "D", 1), MakePlayer("D3", "D", 2), MakePlayer("D4", "D", 2),
        MakePlayer("F1", "F", 3, true), MakePlayer("F2", "F", 3, true), MakePlayer("F3", "F", 1, true), MakePlayer("F4", "F", 1),
        MakePlayer("F5", "F", 2), MakePlayer("F6", "F", 2), MakePlayer("B1", "B", 3), MakePlayer("B2", "B", 1)
    ];
    const total = (team: SignedUpPlayer[]) => team.reduce((sum, player) => sum + player.Ratings.Skill, 0);

    test("makes even teams with equal defense and rating", () => {
        for (let seed = 1; seed <= 5; seed++) {
            const rosters = GenerateRoster({ ReidarMode: "ignore" }, pool, SeededRandom(seed));
            expect(rosters.Black).toHaveLength(6);
            expect(rosters.White).toHaveLength(6);
            const black = GetTeamStats(rosters.Black);
            const white = GetTeamStats(rosters.White);
            expect(black.Defense + black.Both / 2).toBe(white.Defense + white.Both / 2);
            expect(total(rosters.Black)).toBe(total(rosters.White));
        }
    });

    test("puts Reidars on black or splits them evenly", () => {
        const black = GenerateRoster({ ReidarMode: "black" }, pool, SeededRandom(1));
        expect(GetTeamStats(black.Black).Reidars).toBe(3);
        const even = GenerateRoster({ ReidarMode: "even" }, [...pool, MakePlayer("F7", "F", 2, true)], SeededRandom(1));
        expect(GetTeamStats(even.Black).Reidars).toBe(2);
        expect(GetTeamStats(even.White).Reidars).toBe(2);
    });

    test("keeps perma-white players on white", () => {
        const withPermaWhite = pool.map(player => player.Name === "D1" ? { ...player, IsPermaWhite: true } : player);
        for (let seed = 1; seed <= 5; seed++) {
            const rosters = GenerateRoster({ ReidarMode: "ignore" }, withPermaWhite, SeededRandom(seed));
            expect(rosters.White.map(player => player.Name)).toContain("D1");
        }
    });

    test("varies the teams between runs", () => {
        const splits = new Set<string>();
        for (let seed = 1; seed <= 10; seed++) {
            splits.add(GenerateRoster({ ReidarMode: "ignore" }, pool, SeededRandom(seed)).Black.map(player => player.Name).join());
        }
        expect(splits.size).toBeGreaterThan(1);
    });
});
