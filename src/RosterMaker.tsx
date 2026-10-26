import { KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { ReidarMode } from './types/Criteria';
import { Player, Position, RatingKey, RatingKeys, SignedUpPlayer } from './types/Player';
import { Rosters } from './types/Rosters';
import { EmptyCorrections, Signup, SignupCorrections, SignupOverride } from './types/Signup';
import { FetchPlayers } from './functions/ApiFunctions';
import { BuildSignups, SignupKey } from './functions/SignupFunctions';
import { GenerateRoster, GetTeamRatings, GetTeamStats } from './functions/RosterFunctions';
import { FormatCriteriaText, FormatRostersText } from './functions/TextFunctions';
import { LoadStored, SaveStored } from './functions/StorageFunctions';
import Header from './Header';

const PositionText: Record<Position, string> = { F: "F", D: "D" };
const RatingText: Record<RatingKey | "Overall", string> = {
  Overall: "Yleisarvo",
  Offense: "Hyökkäys",
  Defense: "Puolustus",
  Speed: "Nopeus",
  Skill: "Taito",
  Grit: "Sisu"
};
const LevelText: Record<number, string> = { 1: "Aloittelija", 2: "Perus", 3: "Kova" };
const ReidarModes: { Mode: ReidarMode, Label: string }[] = [
  { Mode: "ignore", Label: "Ei väliä" },
  { Mode: "even", Label: "Tasan" },
  { Mode: "black", Label: "Kaikki mustiin" }
];

const ReidarBadge = () => <img className="reidar-badge" src="logo480.png" alt="Reidar" title="Reidar" width={20} height={14} />;

interface Result {
  Comment: string;
  IsEdited: boolean;
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
  const reidarCount = skaters.filter(signup => signup.PlayerId !== null && playerById.get(signup.PlayerId)?.IsReidar === true).length;
  const regularCount = skaters.length - guestCount - reidarCount;
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
      IsEdited: false,
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

  const IsReidar = (Signup: Signup) => Signup.PlayerId !== null && playerById.get(Signup.PlayerId)?.IsReidar === true;

  // Moves one player to the other team, for fine-tuning after the draw.
  const handleMove = (Player: SignedUpPlayer) => {
    if (result === null) {
      return;
    }
    const fromBlack = result.Rosters.Black.some(player => player.Id === Player.Id);
    const byName = (a: SignedUpPlayer, b: SignedUpPlayer) => a.Name.localeCompare(b.Name, "fi");
    const black = fromBlack ? result.Rosters.Black.filter(player => player.Id !== Player.Id) : [...result.Rosters.Black, Player].sort(byName);
    const white = fromBlack ? [...result.Rosters.White, Player].sort(byName) : result.Rosters.White.filter(player => player.Id !== Player.Id);
    setCopyState("idle");
    setResult({ ...result, IsEdited: true, Rosters: { Black: black, White: white } });
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
    const otherTeam = Color === "black" ? "valkoisiin" : "mustiin";
    return (
      <article className={`team team-${Color}`}>
        <header>
          <h3>{Title}</h3>
          <span className="team-count">{Team.length}</span>
        </header>
        <p className="team-stats">
          {stats.Forwards} F · {stats.Defense} D · {stats.Reidars} Reidaria
        </p>
        <ol>
          {Team.map(player => (
            <li key={player.Id}>
              <span className="team-player">
                {player.IsReidar ? <ReidarBadge /> : <span className="badge-placeholder" aria-hidden="true" />}
                {player.Name}
                {player.IsGuest ? <em>vieras</em> : !player.IsReidar && <em>vaki</em>}
              </span>
              <button type="button" className="move" title={`Siirrä ${otherTeam}`} aria-label={`Siirrä ${player.Name} ${otherTeam}`} onClick={() => handleMove(player)}>
                {Color === "black" ? "\u2192" : "\u2190"}
              </button>
            </li>
          ))}
        </ol>
      </article>
    );
  };

  // Black on the left, White on the right; the longer bar shows which team is stronger.
  const RenderRatings = (Generated: Rosters) => {
    const black = GetTeamRatings(Generated.Black);
    const white = GetTeamRatings(Generated.White);
    const keys: (RatingKey | "Overall")[] = ["Overall", ...RatingKeys];
    const BarWidth = (Value: number) => `${Math.max(0, (Value - 40) / 59 * 100)}%`;
    return (
      <div className="ratings" aria-label="Joukkueiden vertailu">
        {keys.map(key => (
          <div key={key} className={key === "Overall" ? "rating rating-overall" : "rating"}>
            <span className={black[key] > white[key] ? "rating-value lead" : "rating-value"}>{black[key]}</span>
            <span className="rating-bar rating-bar-black"><span style={{ width: BarWidth(black[key]) }} /></span>
            <span className="rating-label">{RatingText[key]}</span>
            <span className="rating-bar rating-bar-white"><span style={{ width: BarWidth(white[key]) }} /></span>
            <span className={white[key] > black[key] ? "rating-value lead" : "rating-value"}>{white[key]}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="page" onKeyDown={handleKeyDown}>
        <Header LinkHref="#admin" LinkText="Ylläpito" />

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
                        className={`chip chip-${kind}${IsReidar(signup) ? " chip-reidar" : ""}`}
                        aria-pressed={selected === key}
                        title={signup.Text}
                        onClick={() => setSelected(selected === key ? null : key)}
                      >
                        {kind === "unsure" && <span className="chip-flag">?</span>}
                        {IsReidar(signup) && <ReidarBadge />}
                        <span>{ChipName(signup)}</span>
                        <span className="chip-pos">{kind === "goalie" ? "MV" : ChipPosition(signup)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="hint">
                <span className="hint-counts"><ReidarBadge /> {reidarCount} Reidaria, {regularCount} vakivierasta, {guestCount} vierasta</span>
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
                      {(["F", "D"] as Position[]).map(position => (
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
              {RenderRatings(result.Rosters)}
              <div className="teams">
                {RenderTeam("Musta", result.Rosters.Black, "black")}
                {RenderTeam("Valkoinen", result.Rosters.White, "white")}
              </div>
              <p className="comment">{result.IsEdited ? "Joukkueita on muokattu käsin." : result.Comment} Siirrä pelaajaa toiseen joukkueeseen nuolesta.</p>
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
