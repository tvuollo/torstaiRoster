import { Player } from "../types/Player";
import { Signup, SignupCorrections } from "../types/Signup";
import { ParsedEntry, ParseSignups } from "./ParseFunctions";

export const SignupKey = (Text: string) => Text.trim().toLowerCase().replace(/\s+/g, " ");

// "Vinkka Luka" read as one name gets split at the last space; both halves are matched again.
const ApplySplits = (Entries: ParsedEntry[], Splits: Set<string>, Players: Player[]) => Entries.flatMap(entry => {
    const at = entry.Text.lastIndexOf(" ");
    if (!Splits.has(SignupKey(entry.Text)) || at < 0) {
        return [entry];
    }
    return ParseSignups(`${entry.Text.slice(0, at)}\n${entry.Text.slice(at + 1)}`, Players)
        .map(part => ({ ...part, IsGoalie: entry.IsGoalie }));
});

// Two names the parser split apart get joined back together.
const ApplyMerges = (Entries: ParsedEntry[], Merges: Set<string>, Players: Player[]) => {
    const merged: ParsedEntry[] = [];
    for (let i = 0; i < Entries.length; i++) {
        const next = Entries[i + 1];
        if (next !== undefined && Merges.has(SignupKey(`${Entries[i].Text} ${next.Text}`))) {
            const text = `${Entries[i].Text} ${next.Text}`;
            const reparsed = ParseSignups(text.replace(/\s+/g, " "), Players);
            const asOne = reparsed.length === 1 && reparsed[0].Text === text
                ? reparsed[0]
                : { IsGoalie: false, Match: "none" as const, PlayerId: null, Text: text };
            merged.push({ ...asOne, IsGoalie: Entries[i].IsGoalie || next.IsGoalie });
            i++;
            continue;
        }
        merged.push(Entries[i]);
    }
    return merged;
};

export const BuildSignups = (Text: string, Players: Player[], Corrections: SignupCorrections): Signup[] => {
    const playerIds = new Set(Players.map(player => player.Id));
    let entries = ParseSignups(Text, Players);
    entries = ApplySplits(entries, new Set(Corrections.Splits), Players);
    entries = ApplyMerges(entries, new Set(Corrections.Merges), Players);

    const seen = new Set<string>();
    const signups: Signup[] = [];

    entries.forEach(function (entry, index) {
        const override = Corrections.Overrides[SignupKey(entry.Text)] ?? {};
        let playerId = entry.PlayerId;
        let match = entry.Match;

        if (override.PlayerId !== undefined && (override.PlayerId === null || playerIds.has(override.PlayerId))) {
            playerId = override.PlayerId;
            match = playerId === null ? "none" : "exact";
        }

        // The same regular twice in the list counts once.
        if (playerId !== null && seen.has(playerId)) {
            return;
        }
        if (playerId !== null) {
            seen.add(playerId);
        }

        signups.push({
            GuestLevel: override.Level ?? 2,
            GuestPosition: override.Position ?? "F",
            IsGoalie: override.IsGoalie ?? entry.IsGoalie,
            Key: `${index}-${SignupKey(entry.Text)}`,
            Match: match,
            PlayerId: playerId,
            Text: entry.Text
        });
    });

    return signups;
};
