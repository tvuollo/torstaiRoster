import { KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { ReidarMode } from './types/Criteria';
import { Player, Position, SignedUpPlayer } from './types/Player';
import { Rosters } from './types/Rosters';
import { EmptyCorrections, Signup, SignupCorrections, SignupOverride } from './types/Signup';
import { FetchPlayers } from './functions/ApiFunctions';
import { BuildSignups, SignupKey } from './functions/SignupFunctions';
import { GenerateRoster, GetTeamStats } from './functions/RosterFunctions';
import { FormatCriteriaText, FormatRostersText, PositionLabel } from './functions/TextFunctions';
import { LoadStored, SaveStored } from './functions/StorageFunctions';

const PositionText: Record<Position, string> = { F: "F", D: "D", B: "F/D" };
// Line-up order on the team cards: defense first, then two-way players, then forwards.
const PositionOrder: Record<Position, number> = { D: 0, B: 1, F: 2 };
const LevelText: Record<number, string> = { 1: "Aloittelija", 2: "Perus", 3: "Kova" };
const ReidarModes: { Mode: ReidarMode, Label: string }[] = [
  { Mode: "ignore", Label: "Ei väliä" },
  { Mode: "even", Label: "Tasan" },
  { Mode: "black", Label: "Kaikki mustiin" }
];

interface Result {
  Comment: string;
  Goalies: string[];
  Rosters: Rosters;
  Signature: string;
}

function RosterMaker() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadError, setLoadError] = useState<string>("");
  const [text, setText] = useState<string>(() => LoadStored("torstai-paste", ""));
  const [corrections, setCorrections] = useState<SignupCorrections>(() => LoadStored("torstai-corrections", EmptyCorrections));
  const [selected, setSelected] = useState<string | null>(null);
  const [reidarMode, setReidarMode] = useState<ReidarMode>(() => LoadStored("torstai-reidar-mode", "ignore"));
  const [result, setResult] = useState<Result | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    FetchPlayers()
      .then(setPlayers)
      .catch((error: Error) => setLoadError(error.message));
  }, []);

  useEffect(() => SaveStored("torstai-paste", text), [text]);
  useEffect(() => SaveStored("torstai-corrections", corrections), [corrections]);
  useEffect(() => SaveStored("torstai-reidar-mode", reidarMode), [reidarMode]);

  const playerById = useMemo(() => new Map(players.map(player => [player.Id, player])), [players]);
  const signups = useMemo(() => BuildSignups(text, players, corrections), [text, players, corrections]);
  const skaters = signups.filter(signup => !signup.IsGoalie);
  const goalies = signups.filter(signup => signup.IsGoalie);
  const guestCount = skaters.filter(signup => signup.PlayerId === null).length;
  const unsureCount = signups.filter(signup => signup.Match === "firstname" || signup.Match === "initial").length;
  const selectedIndex = signups.findIndex(signup => SignupKey(signup.Text) === selected);
  const selectedSignup = selectedIndex >= 0 ? signups[selectedIndex] : null;

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

  const pool = skaters.map(ToSignedUpPlayer);
  const signature = JSON.stringify([reidarMode, pool.map(player => [player.Id, player.Name, player.Position, player.Ratings.Skill])]);

  const setOverride = (Signup: Signup, Changes: SignupOverride) => {
    const key = SignupKey(Signup.Text);
    setCorrections({
      ...corrections,
      Overrides: { ...corrections.Overrides, [key]: { ...corrections.Overrides[key], ...Changes } }
    });
  };

  const handleSplit = (Signup: Signup) => {
    const key = SignupKey(Signup.Text);
    setCorrections({
      ...corrections,
      Merges: corrections.Merges.filter(merge => merge !== key),
      Splits: [...corrections.Splits, key]
    });
    setSelected(null);
  };

  const handleMerge = (Index: number) => {
    const key = SignupKey(`${signups[Index].Text} ${signups[Index + 1].Text}`);
    setCorrections({
      ...corrections,
      Merges: [...corrections.Merges, key],
      Splits: corrections.Splits.filter(split => split !== key)
    });
    setSelected(key);
  };

  const handleGenerate = () => {
    if (pool.length < 2) {
      return;
    }
    setCopyState("idle");
    setResult({
      Comment: FormatCriteriaText({ ReidarMode: reidarMode }),
      Goalies: goalies.map(goalie => goalie.PlayerId !== null ? playerById.get(goalie.PlayerId)?.Name ?? goalie.Text : goalie.Text),
      Rosters: GenerateRoster({ ReidarMode: reidarMode }, pool),
      Signature: signature
    });
  };

  const handleKeyDown = (Event: KeyboardEvent) => {
    if (Event.key === "Enter" && (Event.ctrlKey || Event.metaKey)) {
      Event.preventDefault();
      handleGenerate();
    }
    if (Event.key === "Escape") {
      setSelected(null);
    }
  };

  const resultText = result !== null ? FormatRostersText(result.Rosters, result.Goalies) : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(resultText)
      .then(() => setCopyState("copied"))
      .catch(() => setCopyState("failed"));
  };

  const ChipName = (Signup: Signup) => {
    const player = Signup.PlayerId !== null ? playerById.get(Signup.PlayerId) : undefined;
    return player?.Name ?? Signup.Text;
  };

  const ChipPosition = (Signup: Signup) => {
    const player = Signup.PlayerId !== null ? playerById.get(Signup.PlayerId) : undefined;
    return PositionText[player?.Position ?? Signup.GuestPosition];
  };

  const ChipKind = (Signup: Signup) => {
    if (Signup.IsGoalie) {
      return "goalie";
    }
    if (Signup.PlayerId === null) {
      return "guest";
    }
    return Signup.Match === "exact" ? "known" : "unsure";
  };

  const RenderTeam = (Title: string, Team: SignedUpPlayer[], Color: "black" | "white") => {
    const stats = GetTeamStats(Team);
    return (
      <article className={`team team-${Color}`}>
        <header>
          <h3>{Title}</h3>
          <span className="team-count">{Team.length}</span>
        </header>
        <p className="team-stats">
          {stats.Forwards} F · {stats.Defense} D{stats.Both > 0 ? ` · ${stats.Both} F/D` : ""} · {stats.Reidars} Reidaria
        </p>
        <ol>
          {[...Team].sort((a, b) => PositionOrder[a.Position] - PositionOrder[b.Position] || a.Name.localeCompare(b.Name, "fi")).map(player => (
            <li key={player.Id}>
              <span>{player.Name}{player.IsGuest && <em> vieras</em>}</span>
              <span className="pos">{PositionLabel(player)}</span>
            </li>
          ))}
        </ol>
      </article>
    );
  };

  return (
    <div className="page" onKeyDown={handleKeyDown}>
      <header className="topbar">
        <h1>Torstai<span>Roster</span></h1>
        <a href="#admin">Ylläpito</a>
      </header>

      <main className="layout">
        <section className="panel">
          <div className="panel-head">
            <h2>Ilmoittautuneet</h2>
            <span className="tally">{skaters.length} pelaajaa{goalies.length > 0 ? ` + ${goalies.length} MV` : ""}</span>
          </div>

          <label className="label" htmlFor="paste">Liitä nimet Nimenhuudosta</label>
          <textarea
            id="paste"
            className="paste"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tuomas Peter M Sakke K Jussi L (MV) ..."
            spellCheck={false}
          />
          {loadError !== "" && <p className="error">{loadError}</p>}

          {signups.length > 0 && (
            <>
              <ul className="chips" aria-label="Tunnistetut nimet">
                {signups.map(signup => {
                  const key = SignupKey(signup.Text);
                  const kind = ChipKind(signup);
                  return (
                    <li key={signup.Key}>
                      <button
                        type="button"
                        className={`chip chip-${kind}`}
                        aria-pressed={selected === key}
                        title={signup.Text}
                        onClick={() => setSelected(selected === key ? null : key)}
                      >
                        {kind === "unsure" && <span className="chip-flag">?</span>}
                        <span>{ChipName(signup)}</span>
                        <span className="chip-pos">{kind === "goalie" ? "MV" : ChipPosition(signup)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="hint">
                {guestCount > 0 && <span className="hint-guest">{guestCount} vierasta</span>}
                {unsureCount > 0 && <span className="hint-unsure">{unsureCount} arvattu, tarkista</span>}
                <span>Napauta nimeä korjataksesi.</span>
              </p>
            </>
          )}

          {selectedSignup !== null && (
            <div className="editor">
              <div className="editor-head">
                <strong>{selectedSignup.Text}</strong>
                <button type="button" className="ghost" onClick={() => setSelected(null)}>Sulje</button>
              </div>

              <label className="field">
                <span>Pelaaja</span>
                <select value={selectedSignup.PlayerId ?? ""} onChange={(e) => setOverride(selectedSignup, { PlayerId: e.target.value === "" ? null : e.target.value })}>
                  <option value="">Vieras</option>
                  {players.map(player => <option key={player.Id} value={player.Id}>{player.Name}</option>)}
                </select>
                {(selectedSignup.Match === "firstname" || selectedSignup.Match === "initial") && (
                  <button type="button" className="confirm" onClick={() => setOverride(selectedSignup, { PlayerId: selectedSignup.PlayerId })}>Oikein</button>
                )}
              </label>

              {selectedSignup.PlayerId === null && !selectedSignup.IsGoalie && (
                <>
                  <div className="field">
                    <span>Paikka</span>
                    <div className="segmented">
                      {(["F", "D", "B"] as Position[]).map(position => (
                        <button key={position} type="button" aria-pressed={selectedSignup.GuestPosition === position} onClick={() => setOverride(selectedSignup, { Position: position })}>{PositionText[position]}</button>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <span>Taso</span>
                    <div className="segmented">
                      {[1, 2, 3].map(level => (
                        <button key={level} type="button" aria-pressed={selectedSignup.GuestLevel === level} onClick={() => setOverride(selectedSignup, { Level: level })}>{LevelText[level]}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="editor-actions">
                <button type="button" aria-pressed={selectedSignup.IsGoalie} onClick={() => setOverride(selectedSignup, { IsGoalie: !selectedSignup.IsGoalie })}>Maalivahti</button>
                {selectedSignup.Text.includes(" ") && <button type="button" onClick={() => handleSplit(selectedSignup)}>Jaa kahdeksi</button>}
                {selectedIndex < signups.length - 1 && <button type="button" onClick={() => handleMerge(selectedIndex)}>Yhdistä seuraavaan ({signups[selectedIndex + 1].Text})</button>}
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Rosterit</h2>
          </div>

          <div className="field">
            <span>Reidarit</span>
            <div className="segmented">
              {ReidarModes.map(option => (
                <button key={option.Mode} type="button" aria-pressed={reidarMode === option.Mode} onClick={() => setReidarMode(option.Mode)}>{option.Label}</button>
              ))}
            </div>
          </div>

          <button type="button" className="generate" disabled={pool.length < 2} onClick={() => handleGenerate()}>
            {result === null ? "Tee rosterit" : "Arvo uudelleen"}
            <kbd>Ctrl + Enter</kbd>
          </button>

          {result === null && (
            <p className="empty">Liitä ilmoittautuneet ja paina <strong>Tee rosterit</strong>. Joukkueet tasataan pelipaikkojen, taitojen ja Reidar-valinnan mukaan.</p>
          )}

          {result !== null && (
            <>
              {result.Signature !== signature && <p className="stale">Lista on muuttunut. Arvo rosterit uudelleen.</p>}
              <div className="teams">
                {RenderTeam("Musta", result.Rosters.Black, "black")}
                {RenderTeam("Valkoinen", result.Rosters.White, "white")}
              </div>
              <p className="comment">{result.Comment}</p>
              {result.Goalies.length > 0 && <p className="goalies"><strong>MV</strong> {result.Goalies.join(", ")}</p>}
              <button type="button" className="copy" onClick={() => handleCopy()}>{copyState === "copied" ? "Kopioitu" : "Kopioi tekstinä"}</button>
              {copyState === "failed" && (
                <textarea className="copy-fallback" readOnly rows={8} value={resultText} onFocus={(e) => e.target.select()} autoFocus aria-label="Rosterit tekstinä" />
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default RosterMaker
