import { Criteria } from "../types/Criteria";
import { Rosters } from "../types/Rosters";
import { SignedUpPlayer } from "../types/Player";
import { GetRandomInt } from "./NumberFunctions";

const InsertVerbOptions: string[] = [
    "pyritään laittamaan",
    "kokeillaan laittaa",
    "yritetään laittaa",
    "meinataan pistää",
    "tungetaan mahdollisuuksien mukaan",
    "pistetään se mitä pystytään",
    "laitetaan jos mahtuu"
];

const TextAffixOptions: string[] = [
    "Jari tekee muutokset jos tarpeen.",
    "Hyvät pelit tulee.",
    "Ihan ok rosterit tulee.",
    "Hyvältä näyttää.",
    "Sitten ei muuta kuin generoimaan.",
    "Hyvä torstai tulee.",
    "Eipä siinä sitten ku peliä.",
    "Ja ei muuta kuin peliä.",
    "Kiekko jäähän vain.",
    "Säädetään kopissa loput."
];

const PickOne = (Options: string[]) => Options[GetRandomInt(Options.length)];

export const FormatCriteriaText = (Crit: Criteria) => {
    if (Crit.ReidarMode === "ignore") {
        return "Reidareista ei välitetä. " + PickOne(TextAffixOptions);
    }

    if (Crit.ReidarMode === "even") {
        return `Reidarit ${PickOne(InsertVerbOptions)} tasan molemmille puolille. ` + PickOne(TextAffixOptions);
    }

    return `Kaikki Reidarit ${PickOne(InsertVerbOptions)} mustille. ` + PickOne(TextAffixOptions);
};

export const PositionLabel = (Player: SignedUpPlayer) => Player.Position === "B" ? "F/D" : Player.Position;

// Plain text for pasting into Nimenhuuto or WhatsApp.
export const FormatRostersText = (Generated: Rosters, Goalies: string[]) => {
    const team = (Title: string, Players: SignedUpPlayer[]) =>
        `${Title} (${Players.length})\n` + Players.map(player => `${player.Name} (${PositionLabel(player)})`).join("\n");

    let text = team("MUSTA", Generated.Black) + "\n\n" + team("VALKOINEN", Generated.White);
    if (Goalies.length > 0) {
        text += `\n\nMV: ${Goalies.join(", ")}`;
    }
    return text;
};
