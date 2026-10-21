import { useEffect, useState } from 'react';
import { Criteria, ReidarMode } from './types/Criteria';
import { Player, Position, SignedUpPlayer } from './types/Player';
import { Rosters } from './types/Rosters';
import { Signup } from './types/Signup';
import { FetchPlayers } from './functions/ApiFunctions';
import { ParseSignups } from './functions/ParseFunctions';
import { GenerateRoster, GetTeamStats } from './functions/RosterFunctions';
import { FormatCriteriaText, FormatRostersText, PositionLabel } from './functions/TextFunctions';

const NextPosition: Record<Position, Position> = { F: "D", D: "B", B: "F" };
const PositionText: Record<Position, string> = { F: "F", D: "D", B: "F/D" };
const LevelText: Record<number, string> = { 1: "Aloittelija", 2: "Perus", 3: "Kova" };

let keyCounter = 0;
const NewKey = () => `row-${++keyCounter}`;

const NewSignup = (Text: string, PlayerId: string | null = null): Signup => ({
  GuestLevel: 2,
  GuestPosition: "F",
  IsGoalie: false,
  Key: NewKey(),
  Match: PlayerId === null ? "none" : "exact",
  PlayerId: PlayerId,
  Text: Text
});

function RosterMaker() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadError, setLoadError] = useState<string>("");
  const [pasteText, setPasteText] = useState<string>("");
  const [signups, setSignups] = useState<Signup[]>([]);
  const [generationCriteria, setGenerationCriteria] = useState<Criteria>({ ReidarMode: "ignore" });
  const [criteriaText, setCriteriaText] = useState<string>(FormatCriteriaText({ ReidarMode: "ignore" }));
  const [generatedRosters, setGeneratedRosters] = useState<Rosters | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    FetchPlayers()
      .then(setPlayers)
      .catch((error: Error) => setLoadError(error.message));
  }, []);

  const playerById = new Map(players.map(player => [player.Id, player]));
  const skaters = signups.filter(signup => !signup.IsGoalie);
  const goalies = signups.filter(signup => signup.IsGoalie);
  const signedUpIds = new Set(signups.map(signup => signup.PlayerId).filter(id => id !== null));
  const unsignedPlayers = players.filter(player => !signedUpIds.has(player.Id));

  const updateSignup = (Key: string, Changes: Partial<Signup>) => {
    setSignups(signups.map(signup => signup.Key === Key ? { ...signup, ...Changes } : signup));
  };

  const handleParseClick = () => {
    const seen = new Set<string>();
    const parsed: Signup[] = [];
    ParseSignups(pasteText, players).forEach(function (entry) {
      // The same regular twice in the paste counts once.
      if (entry.PlayerId !== null && seen.has(entry.PlayerId)) {
        return;
      }
      if (entry.PlayerId !== null) {
        seen.add(entry.PlayerId);
      }
      parsed.push({ ...NewSignup(entry.Text, entry.PlayerId), IsGoalie: entry.IsGoalie, Match: entry.Match });
    });
    setSignups(parsed);
    setActiveStep(2);
  };

  const handlePoolPlayerClick = (Player: Player) => {
    setSignups([...signups, NewSignup(Player.Name, Player.Id)]);
  };

  const handleMatchChange = (Key: string, PlayerId: string) => {
    updateSignup(Key, { PlayerId: PlayerId === "" ? null : PlayerId, Match: PlayerId === "" ? "none" : "exact" });
  };

  // Joins a guest with the row below it, for names the paste split in two.
  const handleMergeClick = (Index: number) => {
    const next = signups[Index + 1];
    const merged = { ...signups[Index], Text: `${signups[Index].Text} ${next.Text}`, PlayerId: null, Match: "none" as const };
    setSignups([...signups.slice(0, Index), merged, ...signups.slice(Index + 2)]);
  };

  // Splits a guest at the last space, for names the paste joined together.
  const handleSplitClick = (Index: number) => {
    const signup = signups[Index];
    const at = signup.Text.lastIndexOf(" ");
    const first = { ...signup, Text: signup.Text.slice(0, at) };
    const second = NewSignup(signup.Text.slice(at + 1));
    setSignups([...signups.slice(0, Index), first, second, ...signups.slice(Index + 1)]);
  };

  const handleCriteriaChange = (Mode: ReidarMode) => {
    const updatedCriteria: Criteria = { ReidarMode: Mode };
    setGenerationCriteria(updatedCriteria);
    setCriteriaText(FormatCriteriaText(updatedCriteria));
  };

  const ToSignedUpPlayer = (Signup: Signup): SignedUpPlayer => {
    const player = Signup.PlayerId !== null ? playerById.get(Signup.PlayerId) : undefined;
    if (player !== undefined) {
      return { ...player, IsGuest: false };
    }
    const level = Signup.GuestLevel;
    return {
      Aliases: [],
      Id: Signup.Key,
      IsGuest: true,
      IsPermaWhite: false,
      IsReidar: false,
      Name: Signup.Text,
      Position: Signup.GuestPosition,
      Ratings: { Offense: level, Defense: level, Speed: level, Skill: level, Grit: level }
    };
  };

  const handleGenerateClick = () => {
    setActiveStep(4);
    setCopied(false);
    setGeneratedRosters(GenerateRoster(generationCriteria, skaters.map(ToSignedUpPlayer)));
  };

  const handleCopyClick = () => {
    if (generatedRosters === null) {
      return;
    }
    navigator.clipboard.writeText(FormatRostersText(generatedRosters, goalies.map(goalie => goalie.Text)))
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  const RenderTeam = (Title: string, Team: SignedUpPlayer[], Black: boolean) => {
    const stats = GetTeamStats(Team);
    return (
      <div>
        <h3 style={{ background: Black ? "black" : "white", color: Black ? "white" : "black", fontSize: 18, lineHeight: "18px", marginTop: 40, padding: 10 }}>{Title} <small>({Team.length})</small></h3>
        <p className="team-stats">F {stats.Forwards} · D {stats.Defense}{stats.Both > 0 ? ` · F/D ${stats.Both}` : ""} · Reidarit {stats.Reidars}</p>
        <ul>
          {Team.map(player => (
            <li key={player.Id}>{player.Name} <small>({PositionLabel(player)}){player.IsGuest ? " vieras" : ""}</small></li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="app" data-active={activeStep}>
      <div className='flex-item' id="step1" data-active={activeStep === 1}>
        <h2>Liitä ilmoittautuneet</h2>
        <p>Kopioi nimet Nimenhuudon tapahtumasta ja liitä tähän. (MV) merkityt jätetään joukkueista pois.</p>
        <textarea className="paste" rows={6} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Tuomas Peter M Sakke K Jussi L (MV) ..." />
        <button className="parse" disabled={pasteText.trim() === "" || players.length === 0} onClick={() => handleParseClick()}>Tunnista nimet</button>
        {loadError !== "" && <p className="error">{loadError}</p>}
        <h2>Tai lisää käsin</h2>
        <table className="table table1">
          <thead>
            <tr>
              <th>Nimi</th>
              <th>Pelipaikka</th>
              <th>Reidar</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {unsignedPlayers.map((player) => (
              <tr key={player.Id} id={`pool-${player.Id}`}>
                <th>{player.Name}</th>
                <td>{PositionText[player.Position]}</td>
                <td style={{ color: "blue" }}>{player.IsReidar ? "X" : ""}</td>
                <td>
                  <button onClick={() => handlePoolPlayerClick(player)} style={{ marginLeft: 20 }}>+</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p><a href="#admin">Ylläpito</a></p>
        <div className="back">
          <div />
          <button type="button" onClick={() => setActiveStep(2)}>Jatka ({skaters.length}) &rsaquo;</button>
        </div>
      </div>

      <div className='flex-item' id="step2" data-active={activeStep === 2}>
        <h2>Ilmoittautuneet ({skaters.length})</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Nimi</th>
              <th>Pelaaja</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {signups.map((signup, index) => {
              const isGuest = signup.PlayerId === null;
              const isUnsure = signup.Match === "firstname" || signup.Match === "initial";
              return (
                <tr key={signup.Key} className={signup.IsGoalie ? "goalie" : isUnsure ? "unsure" : ""}>
                  <th>
                    {isGuest
                      ? <input type="text" value={signup.Text} onChange={(e) => updateSignup(signup.Key, { Text: e.target.value })} />
                      : signup.Text}
                    {isGuest && !signup.IsGoalie && (
                      <span className="guest-tools">
                        <button title="Jaa kahdeksi" disabled={!signup.Text.includes(" ")} onClick={() => handleSplitClick(index)}>Jaa</button>
                        <button title="Yhdistä seuraavaan" disabled={index === signups.length - 1} onClick={() => handleMergeClick(index)}>Yhdistä &darr;</button>
                      </span>
                    )}
                  </th>
                  <td>
                    <select value={signup.PlayerId ?? ""} onChange={(e) => handleMatchChange(signup.Key, e.target.value)}>
                      <option value="">Vieras</option>
                      {players.map(player => (
                        <option key={player.Id} value={player.Id}>{player.Name}</option>
                      ))}
                    </select>
                    {isGuest && !signup.IsGoalie && (
                      <span className="guest-tools">
                        <button title="Pelipaikka" onClick={() => updateSignup(signup.Key, { GuestPosition: NextPosition[signup.GuestPosition] })}>{PositionText[signup.GuestPosition]}</button>
                        <select title="Taso" value={signup.GuestLevel} onChange={(e) => updateSignup(signup.Key, { GuestLevel: Number(e.target.value) })}>
                          {[1, 2, 3].map(level => <option key={level} value={level}>{LevelText[level]}</option>)}
                        </select>
                      </span>
                    )}
                  </td>
                  <td>
                    <button title="Maalivahti" className={signup.IsGoalie ? "active" : ""} onClick={() => updateSignup(signup.Key, { IsGoalie: !signup.IsGoalie })}>MV</button>
                    <button onClick={() => setSignups(signups.filter(row => row.Key !== signup.Key))}>X</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>
                <button onClick={() => setSignups([...signups, NewSignup("")])} style={{ marginTop: 10, padding: "4px 16px" }}>Lisää vieras</button>
              </td>
            </tr>
          </tfoot>
        </table>
        <p className="legend">Keltaiset arvattiin nimen perusteella, tarkista ne. MV-merkityt eivät ole joukkueissa.</p>
        <div className="back">
          <button type="button" onClick={() => setActiveStep(1)}>&lsaquo; Takaisin</button>
          <button type="button" onClick={() => setActiveStep(3)}>Jatka ({skaters.length}) &rsaquo;</button>
        </div>
      </div>

      <div className='flex-item' id="step3" data-active={activeStep === 3}>
        <h2>Arvo rosterit <small>({skaters.length} pelaajaa)</small></h2>
        <label className="criteria">
          <input name="ReidarMode" type="radio" checked={generationCriteria.ReidarMode === "ignore"} onChange={() => handleCriteriaChange("ignore")} />
          Reidareilla ei väliä
        </label>
        <label className="criteria">
          <input name="ReidarMode" type="radio" checked={generationCriteria.ReidarMode === "even"} onChange={() => handleCriteriaChange("even")} />
          Reidarit tasan molemmille puolille
        </label>
        <label className="criteria">
          <input name="ReidarMode" type="radio" checked={generationCriteria.ReidarMode === "black"} onChange={() => handleCriteriaChange("black")} />
          Reidarit samalle puolelle (musta)
        </label>
        <hr />
        <p className="criteriatext">Puolustajat ja pelaajien taidot tasataan aina. {criteriaText}</p>
        <button className="generate" disabled={skaters.length < 2} onClick={() => handleGenerateClick()}>TEE ROSTERIT</button>
        {skaters.length < 2 && (<p style={{ color: "red", textAlign: "center" }}><strong>Lisää ensin vähintään kaksi (2) pelaajaa.</strong></p>)}
        <div className="back">
          <button type="button" onClick={() => setActiveStep(2)}>&lsaquo; Takaisin</button>
        </div>
      </div>

      <div className="flex-item" id="step4">
        <h2>Rosterit ({skaters.length} pelaajaa)</h2>
        {generatedRosters !== null && (
          <>
            <div className="roster-container">
              {RenderTeam("Musta", generatedRosters.Black, true)}
              {RenderTeam("Valkoinen", generatedRosters.White, false)}
            </div>
            {goalies.length > 0 && <p><strong>MV:</strong> {goalies.map(goalie => goalie.Text).join(", ")}</p>}
            <div className="result-tools">
              <button onClick={() => handleGenerateClick()}>Arvo uudelleen</button>
              <button onClick={() => handleCopyClick()}>{copied ? "Kopioitu!" : "Kopioi tekstinä"}</button>
            </div>
          </>
        )}
        <div className="back">
          <button type="button" onClick={() => setActiveStep(3)}>&lsaquo; Takaisin</button>
        </div>
      </div>

      <h1 style={{transform: "rotateZ(-2deg)"}}>Torstai Roster <small><strong><i><u>BETA</u></i></strong></small><small><strong style={{color: "black"}}>0.2</strong></small></h1>
      {skaters.length > 0 && activeStep < 4 &&
        <p className="counter">{skaters.length}</p>
      }
    </div>
  )
}

export default RosterMaker
