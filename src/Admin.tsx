import { FormEvent, useEffect, useState } from 'react';
import { Player, Position, RatingKey, RatingKeys } from './types/Player';
import { FetchIsAdmin, FetchPlayers, Login, Logout, SavePlayers } from './functions/ApiFunctions';

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
    setIsDirty(true);
  };

  // Removal only takes effect on save, so no confirmation step is needed.
  const handleRemoveClick = (Player: Player) => {
    setPlayers(players.filter(player => player.Id !== Player.Id));
    setIsDirty(true);
  };

  const handleSaveClick = () => {
    setMessage("Tallennetaan...");
    SavePlayers(players)
      .then(saved => { setPlayers(saved); setIsDirty(false); setMessage("Tallennettu."); })
      .catch((error: Error) => setMessage(error.message));
  };

  if (isAdmin === null) {
    return <div className="admin"><p>Ladataan...</p></div>;
  }

  if (!isAdmin) {
    return (
      <div className="admin">
        <h2>Ylläpito</h2>
        <form onSubmit={handleLogin}>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Salasana" autoFocus />
          <button type="submit">Kirjaudu</button>
        </form>
        {message !== "" && <p className="error">{message}</p>}
        <p><a href="#">&lsaquo; Takaisin rostereihin</a></p>
      </div>
    );
  }

  return (
    <div className="admin">
      <div className="admin-tools">
        <a href="#">&lsaquo; Rosterit</a>
        <button onClick={() => handleAddClick()}>Lisää pelaaja</button>
        <button className="save" disabled={!isDirty} onClick={() => handleSaveClick()}>Tallenna</button>
        <button onClick={() => handleLogout()}>Kirjaudu ulos</button>
        <span>{isDirty ? "Tallentamattomia muutoksia" : message}</span>
      </div>
      <h2>Pelaajat ({players.length})</h2>
      <p>Taidot 1-3. Muut nimet: pilkulla erotettuna ne muodot, joilla pelaaja näkyy Nimenhuudossa (esim. "Tuomas, Tumppi").</p>
      <div className="admin-table">
        <table className="table">
          <thead>
            <tr>
              <th>Nimi</th>
              <th>Muut nimet</th>
              <th>Paikka</th>
              <th>Reidar</th>
              <th title="Pelaa aina valkoisissa">Aina valk.</th>
              {RatingKeys.map(key => <th key={key}>{RatingText[key]}</th>)}
              <th />
            </tr>
          </thead>
          <tbody>
            {players.map(player => (
              <tr key={player.Id}>
                <th><input type="text" value={player.Name} placeholder="Nimi kuten Nimenhuudossa" onChange={(e) => updatePlayer(player.Id, { Name: e.target.value })} /></th>
                <td>
                  <input
                    type="text"
                    defaultValue={player.Aliases.join(", ")}
                    onBlur={(e) => updatePlayer(player.Id, { Aliases: e.target.value.split(",").map(alias => alias.trim()).filter(alias => alias !== "") })}
                  />
                </td>
                <td>
                  <select value={player.Position} onChange={(e) => updatePlayer(player.Id, { Position: e.target.value as Position })}>
                    <option value="F">F</option>
                    <option value="D">D</option>
                    <option value="B">F/D</option>
                  </select>
                </td>
                <td><input type="checkbox" checked={player.IsReidar} onChange={(e) => updatePlayer(player.Id, { IsReidar: e.target.checked })} /></td>
                <td><input type="checkbox" checked={player.IsPermaWhite} onChange={(e) => updatePlayer(player.Id, { IsPermaWhite: e.target.checked })} /></td>
                {RatingKeys.map(key => (
                  <td key={key}>
                    <select value={player.Ratings[key]} onChange={(e) => updateRating(player, key, Number(e.target.value))}>
                      {[1, 2, 3].map(value => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </td>
                ))}
                <td><button onClick={() => handleRemoveClick(player)}>X</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Admin
