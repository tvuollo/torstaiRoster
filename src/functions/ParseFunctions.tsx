import { FirstNames } from "../data/FirstNames";
import { Player } from "../types/Player";

export type MatchType = "exact" | "initial" | "firstname" | "none";

export interface ParsedEntry {
    IsGoalie: boolean;
    Match: MatchType;
    PlayerId: string | null;
    Text: string;
}

interface AliasEntry {
    PlayerId: string;
    Tokens: string[];
}

const GoalieMarker = /^\(mv\)$/i;

export const NormalizeToken = (Token: string) => Token.toLowerCase().replace(/[.,]+$/, "");

const Tokenize = (Text: string) => Text
    .replace(/\(\s*mv\s*\)/gi, " (MV) ")
    .split(/\s+/)
    .filter(token => token.length > 0);

const IsInitial = (Token: string) => /^\p{Lu}\p{Ll}?\.?$/u.test(Token);

const IsLowercaseWord = (Token: string) => /^\p{Ll}/u.test(Token);

// "H" or "Ra" in a profile matches "Hyötylä" or "Rantanen" in the paste, and the other way round.
// A pasted first name is never read as a surname, so "Tuomas V" doesn't swallow the next player "Ville".
const TokensMatchByInitial = (AliasToken: string, PastedToken: string, KnownFirstNames: Set<string>) => {
    if (AliasToken === PastedToken) {
        return true;
    }
    if (PastedToken.length > AliasToken.length && KnownFirstNames.has(PastedToken)) {
        return false;
    }
    const shorter = AliasToken.length < PastedToken.length ? AliasToken : PastedToken;
    const longer = shorter === AliasToken ? PastedToken : AliasToken;
    return shorter.length <= 2 && longer.startsWith(shorter);
};

const BuildAliasIndex = (Players: Player[]) => {
    const index: AliasEntry[] = [];
    Players.forEach(function (player) {
        [player.Name, ...player.Aliases].forEach(function (alias) {
            const tokens = Tokenize(alias).map(NormalizeToken);
            if (tokens.length > 0) {
                index.push({ PlayerId: player.Id, Tokens: tokens });
            }
        });
    });
    return index;
};

const FindAliasMatch = (Index: AliasEntry[], Tokens: string[], Start: number, KnownFirstNames: Set<string>) => {
    let best: { PlayerId: string; Length: number; Match: MatchType } | null = null;

    Index.forEach(function (alias) {
        const length = alias.Tokens.length;
        if (Start + length > Tokens.length) {
            return;
        }
        const pasted = Tokens.slice(Start, Start + length).map(NormalizeToken);
        if (pasted.some(token => GoalieMarker.test(token))) {
            return;
        }
        let match: MatchType | null = null;
        if (pasted.every((token, i) => token === alias.Tokens[i])) {
            match = "exact";
        }
        else if (length > 1 && pasted.every((token, i) => i < length - 1 ? token === alias.Tokens[i] : TokensMatchByInitial(alias.Tokens[i], token, KnownFirstNames))) {
            match = "initial";
        }
        if (match === null) {
            return;
        }
        const isBetter = best === null
            || length > best.Length
            || (length === best.Length && best.Match === "initial" && match === "exact");
        if (isBetter) {
            best = { PlayerId: alias.PlayerId, Length: length, Match: match };
        }
    });

    return best as { PlayerId: string; Length: number; Match: MatchType } | null;
};

// How many tokens an unrecognised name probably spans, e.g. "Peter M", "Aatu ylinampa" or "Joonas Salminen".
const GuessNameLength = (Tokens: string[], Start: number, Index: AliasEntry[], KnownFirstNames: Set<string>) => {
    let length = 1;
    while (Start + length < Tokens.length && length < 3) {
        const token = Tokens[Start + length];
        const normalized = NormalizeToken(token);
        if (GoalieMarker.test(token) || FindAliasMatch(Index, Tokens, Start + length, KnownFirstNames)?.Match === "exact") {
            break;
        }
        if (IsInitial(token) || IsLowercaseWord(token)) {
            length++;
            break;
        }
        if (length === 1 && !KnownFirstNames.has(normalized)) {
            length++;
            continue;
        }
        break;
    }
    return length;
};

export const ParseSignups = (Text: string, Players: Player[]) => {
    const index = BuildAliasIndex(Players);
    const knownFirstNames = new Set<string>(FirstNames);
    const firstNameOwners = new Map<string, string[]>();

    Players.forEach(function (player) {
        const firstName = NormalizeToken(Tokenize(player.Name)[0] ?? "");
        knownFirstNames.add(firstName);
        firstNameOwners.set(firstName, [...(firstNameOwners.get(firstName) ?? []), player.Id]);
    });

    const entries: ParsedEntry[] = [];

    // Line breaks, commas and semicolons always end a name.
    Text.split(/[\n\r,;]+/).forEach(function (chunk) {
        const tokens = Tokenize(chunk);
        let i = 0;

        while (i < tokens.length) {
            if (GoalieMarker.test(tokens[i])) {
                if (entries.length > 0) {
                    entries[entries.length - 1].IsGoalie = true;
                }
                i++;
                continue;
            }

            const aliasMatch = FindAliasMatch(index, tokens, i, knownFirstNames);
            if (aliasMatch !== null) {
                entries.push({
                    IsGoalie: false,
                    Match: aliasMatch.Match,
                    PlayerId: aliasMatch.PlayerId,
                    Text: tokens.slice(i, i + aliasMatch.Length).join(" ")
                });
                i += aliasMatch.Length;
                continue;
            }

            const length = GuessNameLength(tokens, i, index, knownFirstNames);
            const owners = firstNameOwners.get(NormalizeToken(tokens[i])) ?? [];
            const isUniqueFirstName = length === 1 && owners.length === 1;

            entries.push({
                IsGoalie: false,
                Match: isUniqueFirstName ? "firstname" : "none",
                PlayerId: isUniqueFirstName ? owners[0] : null,
                Text: tokens.slice(i, i + length).join(" ")
            });
            i += length;
        }
    });

    return entries;
};
