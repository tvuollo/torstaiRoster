import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Player, Position, RatingKey, RatingKeys } from './types/Player';
import { FetchIsAdmin, FetchPlayers, IsBrowserStorage, Login, Logout, SavePlayers } from './functions/ApiFunctions';
import { CleanPlayers } from './functions/PlayerFunctions';
import Header from './Header';

const RatingText: Record<RatingKey, string> = {
  Offense: "Hyökkäys",
  Defense: "Puolustus",
  Speed: "Nopeus",
  Skill: "Taito",
  Grit: "Sisu"
};

const MakeId = (Name: string, Players: Player[]) => {
  const base = Name.toLowerCase().replace(/[^a-z0-9åäö]+/g, "-").replace(/^-|-$/g, "") || "pelaaja";
  let id = base;
  for (let i = 2; Players.some(player => player.Id === id); i++) {
    id = `${base}-${i}`;
  }
  return id;
};

function Admin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [password, setPassword] = useState<string>("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    FetchIsAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    if (isAdmin) {
      FetchPlayers().then(setPlayers).catch((error: Error) => setMessage(error.message));
    }
  }, [isAdmin]);

  const handleLogin = (Event: FormEvent) => {
    Event.preventDefault();
    setMessage("");
    Login(password)
      .then(() => { setPassword(""); setIsAdmin(true); })
      .catch((error: Error) => setMessage(error.message));
  };

  const handleLogout = () => {
    Logout().finally(() => { setIsAdmin(false); setPlayers([]); setIsDirty(false); });
  };

  const updatePlayer = (Id: string, Changes: Partial<Player>) => {
    setPlayers(players.map(player => player.Id === Id ? { ...player, ...Changes } : player));
    setIsDirty(true);
    setMessage("");
  };

  const updateRating = (Player: Player, Key: RatingKey, Value: number) => {
    updatePlayer(Player.Id, { Ratings: { ...Player.Ratings, [Key]: Value } });
  };

  const handleAddClick = () => {
    const newPlayer: Player = {
      Aliases: [],
      Id: MakeId(`uusi-${Date.now()}`, players),
      IsPermaWhite: false,
      IsReidar: false,
      Name: "",
      Position: "F",
      Ratings: { Offense: 2, Defense: 2, Speed: 2, Skill: 2, Grit: 2 }
    };
    setPlayers([newPlayer, ...players]);
    setSearch("");
    setIsDirty(true);
  };

  // Removal only takes effect on save, so no confirmation step is needed.
  const handleRemoveClick = (Player: Player) => {
    setPlayers(players.filter(player => player.Id !== Player.Id));
    setIsDirty(true);
  };

  // Downloads the list as players.json, the same file the PHP server keeps in api/data/.
  const handleExportClick = () => {
    const blob = new Blob([JSON.stringify(players, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "players.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportChange = (Event: ChangeEvent<HTMLInputElement>) => {
    const file = Event.target.files?.[0];
    Event.target.value = "";
    if (file === undefined) {
      return;
    }
    file.text()
      .then(text => {
        const imported = CleanPlayers(JSON.parse(text));
        setPlayers(imported);
        setIsDirty(true);
        setMessage(`${imported.length} pelaajaa tuotu. Tallenna, niin ne jäävät voimaan.`);
      })
      .catch((error: Error) => setMessage(`Tuonti epäonnistui: ${error.message}`));
  };

  const handleSaveClick = () => {
    setMessage("Tallennetaan...");
    SavePlayers(players)
      .then(saved => { setPlayers(saved); setIsDirty(false); setMessage("Tallennettu."); })
      .catch((error: Error) => setMessage(error.message));
  };

  const query = search.trim().toLowerCase();
  const visiblePlayers = query === ""
    ? players
    : players.filter(player => [player.Name, ...player.Aliases].some(name => name.toLowerCase().includes(query)));

  if (isAdmin === null) {
    return <div className="page"><p className="empty">Ladataan...</p></div>;
  }

  if (!isAdmin) {
    return (
      <div className="page">
        <Header LinkHref="#" LinkText="Rosterit" />
        <main className="login">
          <form className="panel" onSubmit={handleLogin}>
            <h2>Ylläpito</h2>
            <label className="label" htmlFor="password">Salasana</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            <button type="submit" className="generate">Kirjaudu</button>
            {message !== "" && <p className="error">{message}</p>}
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
        <Header LinkHref="#" LinkText="Rosterit" />
      <div className="admin-bar">
        <input id="search" type="search" placeholder="Etsi pelaajaa" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Etsi pelaajaa" />
        <button type="button" onClick={() => handleAddClick()}>Lisää pelaaja</button>
        <button type="button" className="save" disabled={!isDirty} onClick={() => handleSaveClick()}>Tallenna</button>
        <span className={isDirty ? "status status-dirty" : "status"}>{message !== "" ? message : isDirty ? "Tallentamattomia muutoksia" : ""}</span>
        <button type="button" onClick={() => handleExportClick()}>Vie tiedostoon</button>
        <label className="file-button">
          Tuo tiedostosta
          <input type="file" accept="application/json,.json" onChange={handleImportChange} />
        </label>
        {!IsBrowserStorage && <button type="button" className="ghost" onClick={() => handleLogout()}>Kirjaudu ulos</button>}
      </div>
      <main className="admin">
        {IsBrowserStorage && (
          <p className="stale">Testiversio: muutokset tallentuvat vain tähän selaimeen. Vie tiedostoon ennen siirtoa oikealle palvelimelle.</p>
        )}
        <p className="hint">
          {players.length} pelaajaa. Taidot 1-3. Muut nimet ovat muotoja, joilla pelaaja näkyy Nimenhuudossa, pilkulla erotettuna.
        </p>
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>Nimi</th>
                <th>Muut nimet</th>
                <th>Paikka</th>
                <th>Reidar</th>
                <th title="Pelaa aina valkoisissa">Aina valk.</th>
                {RatingKeys.map(key => <th key={key}>{RatingText[key]}</th>)}
                <th><span className="visually-hidden">Poista</span></th>
              </tr>
            </thead>
            <tbody>
              {visiblePlayers.map(player => (
                <tr key={player.Id}>
                  <th><input type="text" value={player.Name} placeholder="Nimi" aria-label="Nimi" onChange={(e) => updatePlayer(player.Id, { Name: e.target.value })} /></th>
                  <td>
                    <input
                      type="text"
                      aria-label="Muut nimet"
                      defaultValue={player.Aliases.join(", ")}
                      onBlur={(e) => updatePlayer(player.Id, { Aliases: e.target.value.split(",").map(alias => alias.trim()).filter(alias => alias !== "") })}
                    />
                  </td>
                  <td>
                    <div className="segmented small">
                      {(["F", "D"] as Position[]).map(position => (
                        <button key={position} type="button" aria-pressed={player.Position === position} onClick={() => updatePlayer(player.Id, { Position: position })}>{position}</button>
                      ))}
                    </div>
                  </td>
                  <td><input type="checkbox" aria-label="Reidar" checked={player.IsReidar} onChange={(e) => updatePlayer(player.Id, { IsReidar: e.target.checked })} /></td>
                  <td><input type="checkbox" aria-label="Aina valkoisissa" checked={player.IsPermaWhite} onChange={(e) => updatePlayer(player.Id, { IsPermaWhite: e.target.checked })} /></td>
                  {RatingKeys.map(key => (
                    <td key={key}>
                      <div className="segmented small" aria-label={RatingText[key]}>
                        {[1, 2, 3].map(value => (
                          <button key={value} type="button" aria-pressed={player.Ratings[key] === value} onClick={() => updateRating(player, key, value)}>{value}</button>
                        ))}
                      </div>
                    </td>
                  ))}
                  <td><button type="button" className="ghost" aria-label={`Poista ${player.Name}`} onClick={() => handleRemoveClick(player)}>Poista</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default Admin
