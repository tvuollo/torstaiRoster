import { MatchType } from "../functions/ParseFunctions";
import { Position } from "./Player";

// One name from the pasted list, after matching and the user's corrections.
export interface Signup {
    GuestLevel: number;
    GuestPosition: Position;
    IsGoalie: boolean;
    Key: string;
    Match: MatchType;
    PlayerId: string | null;
    Text: string;
}

// Corrections the user made to a name, remembered by the name's text so they
// survive editing the pasted list.
export interface SignupOverride {
    IsGoalie?: boolean;
    Level?: number;
    PlayerId?: string | null;
    Position?: Position;
}

export interface SignupCorrections {
    Merges: string[];
    Overrides: Record<string, SignupOverride>;
    Splits: string[];
}

export const EmptyCorrections: SignupCorrections = { Merges: [], Overrides: {}, Splits: [] };
