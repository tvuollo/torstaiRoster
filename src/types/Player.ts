export type Position = "F" | "D" | "B";

export const RatingKeys = ["Offense", "Defense", "Speed", "Skill", "Grit"] as const;
export type RatingKey = typeof RatingKeys[number];
export type Ratings = Record<RatingKey, number>;

export interface Player {
    Aliases: string[];
    Id: string;
    IsPermaWhite: boolean;
    IsReidar: boolean;
    Name: string;
    Position: Position;
    Ratings: Ratings;
}

export interface SignedUpPlayer extends Player {
    IsGuest: boolean;
}
