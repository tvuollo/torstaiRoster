import { Player, Position, RatingKeys, Ratings } from "../types/Player";

const Positions: Position[] = ["F", "D"];

const CleanRating = (Value: unknown) => Math.max(1, Math.min(3, Math.round(Number(Value) || 2)));

// Same rules as clean_players() in public/api/common.php, so an imported or
// browser-saved list is valid on the PHP server too.
export const CleanPlayers = (Input: unknown): Player[] => {
    if (!Array.isArray(Input)) {
        throw new Error("Tiedostossa ei ole pelaajalistaa.");
    }
    const ids = new Set<string>();
    const players = Input.map((item: Record<string, unknown>) => {
        const name = String(item?.Name ?? "").trim();
        const id = String(item?.Id ?? "").trim();
        if (name === "" || id === "" || ids.has(id)) {
            throw new Error(`Pelaajalta puuttuu nimi tai sama tunnus on kahdesti: ${name || id}`);
        }
        ids.add(id);
        const ratings = (item.Ratings ?? {}) as Record<string, unknown>;
        return {
            Aliases: Array.isArray(item.Aliases) ? item.Aliases.map(alias => String(alias).trim()).filter(alias => alias !== "") : [],
            Id: id.slice(0, 100),
            IsPermaWhite: Boolean(item.IsPermaWhite),
            IsReidar: Boolean(item.IsReidar),
            Name: name.slice(0, 100),
            Position: Positions.includes(item.Position as Position) ? item.Position as Position : "F",
            Ratings: Object.fromEntries(RatingKeys.map(key => [key, CleanRating(ratings[key] ?? 2)])) as Ratings
        };
    });
    return players.sort((a, b) => a.Name < b.Name ? -1 : a.Name > b.Name ? 1 : 0);
};
