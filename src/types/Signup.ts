import { MatchType } from "../functions/ParseFunctions";
import { Position } from "./Player";

// One row on the sign-up list: a known player (PlayerId) or a guest typed or pasted in.
export interface Signup {
    GuestLevel: number;
    GuestPosition: Position;
    IsGoalie: boolean;
    Key: string;
    Match: MatchType;
    PlayerId: string | null;
    Text: string;
}
