import { Criteria } from "../types/Criteria";
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

export const FormatCriteriaText = (Crit: Criteria) => {   
    if (!Crit.Licenses && !Crit.Ogs && !Crit.Reidars && !Crit.Whites) {
        return "Rosterit arvotaan täysin sattumanvaraisesti.";
    }

    const affix = TextAffixOptions[GetRandomInt(TextAffixOptions.length-1)]
    let text = "";

    if (Crit.Ogs) {
        text = text + `Kaikki Original Reidarit ${InsertVerbOptions[GetRandomInt(InsertVerbOptions.length-1)]} mustille. `
    }

    if (Crit.Licenses) {
        text = text + `Kaikki lisenssirosterissa olevat Reidarit ${InsertVerbOptions[GetRandomInt(InsertVerbOptions.length-1)]} mustille. `
    }

    if (Crit.Reidars) {
        text = text + `Kaikki joskus-Reidarit ${InsertVerbOptions[GetRandomInt(InsertVerbOptions.length-1)]} mustille. `
    }

    return text + affix;
};