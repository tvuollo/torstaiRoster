import { expect, test } from "vitest";
import { CleanPlayers } from "./PlayerFunctions";
import Seed from "../../public/api/data/players.seed.json";

test("keeps a valid exported list as it is", () => {
    expect(CleanPlayers(JSON.parse(JSON.stringify(Seed)))).toEqual(Seed);
});

test("fixes bad values and rejects broken lists", () => {
    const [player] = CleanPlayers([{ Id: "x", Name: " Mube ", Position: "Z", Ratings: { Speed: 7 }, Aliases: [" Mubbe ", ""] }]);
    expect(player).toMatchObject({ Name: "Mube", Position: "F", Aliases: ["Mubbe"], Ratings: { Speed: 3, Skill: 2 } });
    expect(() => CleanPlayers({})).toThrow();
    expect(() => CleanPlayers([{ Id: "a", Name: "A" }, { Id: "a", Name: "B" }])).toThrow();
});
