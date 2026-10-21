import { describe, expect, test } from "vitest";
import { BuildSignups } from "./SignupFunctions";
import { EmptyCorrections } from "../types/Signup";
import { Player } from "../types/Player";
import Seed from "../../public/api/data/players.seed.json";

const Players = Seed as Player[];

describe("BuildSignups", () => {
    test("applies match, goalie and guest corrections by name", () => {
        const signups = BuildSignups("Tuomas, Vinkka, Jussi L (MV)", Players, {
            ...EmptyCorrections,
            Overrides: {
                "tuomas": { PlayerId: null },
                "vinkka": { Position: "D", Level: 3 },
                "jussi l": { IsGoalie: false }
            }
        });
        expect(signups.map(signup => [signup.Text, signup.PlayerId, signup.IsGoalie])).toEqual([
            ["Tuomas", null, false], ["Vinkka", null, false], ["Jussi L", null, false]
        ]);
        expect(signups[1]).toMatchObject({ GuestPosition: "D", GuestLevel: 3 });
    });

    test("confirming a guessed match makes it exact", () => {
        const signups = BuildSignups("Tuomas", Players, { ...EmptyCorrections, Overrides: { "tuomas": { PlayerId: "tuomas-v" } } });
        expect(signups[0]).toMatchObject({ PlayerId: "tuomas-v", Match: "exact" });
    });

    test("merges and splits names", () => {
        const merged = BuildSignups("Vinkka Luka Huotari", Players, { ...EmptyCorrections, Merges: ["vinkka luka huotari"] });
        expect(merged.map(signup => signup.Text)).toEqual(["Vinkka Luka Huotari"]);
        const split = BuildSignups("Joonas Salminen Peter M", Players, { ...EmptyCorrections, Splits: ["joonas salminen"] });
        expect(split.map(signup => [signup.Text, signup.PlayerId])).toEqual([["Joonas", "joonas-j"], ["Salminen", null], ["Peter M", "peter-m"]]);
    });

    test("counts the same regular once", () => {
        expect(BuildSignups("Peter M, Peter M", Players, EmptyCorrections)).toHaveLength(1);
    });
});
