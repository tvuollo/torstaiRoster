import { Player } from "../types/Player";
import { CleanPlayers } from "./PlayerFunctions";
import { LoadStored, SaveStored } from "./StorageFunctions";
import Seed from "../../public/api/data/players.seed.json";

// Builds made with VITE_STORAGE=browser (GitHub Pages, demos) have no PHP server:
// players are kept in this browser and the admin needs no login.
export const IsBrowserStorage = import.meta.env.VITE_STORAGE === "browser";

const BrowserPlayersKey = "torstai-players";

// Relative paths, so the app works from any folder on the server (vite base is './').
const ApiUrl = (File: string) => `api/${File}`;

const PostJson = async (File: string, Body: unknown) => {
    const response = await fetch(ApiUrl(File), {
        body: JSON.stringify(Body),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error ?? `Virhe ${response.status}`);
    }
    return data;
};

export const FetchPlayers = async (): Promise<Player[]> => {
    if (IsBrowserStorage) {
        return LoadStored<Player[]>(BrowserPlayersKey, Seed as Player[]);
    }
    const response = await fetch(ApiUrl("players.php"), { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Pelaajien haku epäonnistui (${response.status})`);
    }
    return response.json();
};

export const FetchIsAdmin = async (): Promise<boolean> => {
    if (IsBrowserStorage) {
        return true;
    }
    const response = await fetch(ApiUrl("session.php"), { cache: "no-store", credentials: "same-origin" });
    const data = await response.json().catch(() => ({}));
    return data.admin === true;
};

export const Login = (Password: string) => PostJson("login.php", { password: Password });

export const Logout = () => PostJson("logout.php", {});

export const SavePlayers = async (Players: Player[]): Promise<Player[]> => {
    if (IsBrowserStorage) {
        const cleaned = CleanPlayers(Players);
        SaveStored(BrowserPlayersKey, cleaned);
        return cleaned;
    }
    return PostJson("players.php", Players);
};
