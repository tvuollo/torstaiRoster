import { Player } from "../types/Player";

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
    const response = await fetch(ApiUrl("players.php"), { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Pelaajien haku epäonnistui (${response.status})`);
    }
    return response.json();
};

export const FetchIsAdmin = async (): Promise<boolean> => {
    const response = await fetch(ApiUrl("session.php"), { cache: "no-store", credentials: "same-origin" });
    const data = await response.json().catch(() => ({}));
    return data.admin === true;
};

export const Login = (Password: string) => PostJson("login.php", { password: Password });

export const Logout = () => PostJson("logout.php", {});

export const SavePlayers = (Players: Player[]): Promise<Player[]> => PostJson("players.php", Players);
