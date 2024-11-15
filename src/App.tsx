import { useEffect, useState } from 'react';
import './App.css';
import { Criteria } from './types/Criteria';
import { PlayerWithId } from './types/Player';
import { Players } from './data/Players';
import { Rosters } from './types/Rosters';
import { GenerateRoster } from './functions/RosterFunctions';
import { FormatCriteriaText } from './functions/TextFunctions';

function App() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [playerPool, setPlayerPool] = useState<PlayerWithId[]>([]);
  const [rosterPool, setRosterPool] = useState<PlayerWithId[]>([]);
  const [guestPool, setGuestPool] = useState<PlayerWithId[]>([]);
  const [generationCriteria, setGenerationCriteria] = useState<Criteria>({ Licenses: false, Ogs: false, Reidars: false, Whites: false });
  const [criteriaText, setCriteriaText] = useState<string>("");
  const [generatedRosters, setGeneratedRosters] = useState<Rosters | null>(null);

  useEffect(() => {
    const defaultPlayerPool: PlayerWithId[] = [];
    Players.forEach(function (player) {
      const newPlayer: PlayerWithId = {
        Id: encodeURIComponent(player.Name.toLowerCase()),
        IsDefenseman: player.IsDefenseman,
        IsLicenseReidar: player.IsLicenseReidar,
        IsOriginalReidar: player.IsOriginalReidar,
        IsReidar: player.IsReidar,
        Name: player.Name
      }
      defaultPlayerPool.push(newPlayer);
    });
    setPlayerPool(defaultPlayerPool);

    setCriteriaText(FormatCriteriaText(generationCriteria));
  }, []);

  const handlePoolPlayerClick = (Id: string) => {
    const updatedPlayerPool: PlayerWithId[] = [];
    const updatedRosterPool = rosterPool;
    const playerToAdd = playerPool.find(a => a.Id === Id);

    if (playerToAdd !== undefined) {
      updatedRosterPool.push(playerToAdd);

      playerPool.forEach(function (player) {
        if (player.Id !== Id) {
          const newPlayer: PlayerWithId = {
            Id: encodeURIComponent(player.Name.toLowerCase()),
            IsDefenseman: player.IsDefenseman,
            IsLicenseReidar: player.IsLicenseReidar,
            IsOriginalReidar: player.IsOriginalReidar,
            IsReidar: player.IsReidar,
            Name: player.Name
          }
          updatedPlayerPool.push(newPlayer);
        }
      });
    };

    setPlayerPool(updatedPlayerPool);
    setRosterPool(updatedRosterPool);
  };

  const handleRosterPlayerClick = (Id: string) => {
    const updatedPlayerPool = playerPool;
    const updatedRosterPool: PlayerWithId[] = [];
    const playerToAdd = rosterPool.find(a => a.Id === Id);

    if (playerToAdd !== undefined) {
      updatedPlayerPool.push(playerToAdd);
      updatedPlayerPool.sort((a, b) => {
        const nameA = a.Name.toUpperCase();
        const nameB = b.Name.toUpperCase();
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }
        return 0;
      });

      rosterPool.forEach(function (player) {
        if (player.Id !== Id) {
          const newPlayer: PlayerWithId = {
            Id: encodeURIComponent(player.Name.toLowerCase()),
            IsDefenseman: player.IsDefenseman,
            IsLicenseReidar: player.IsLicenseReidar,
            IsOriginalReidar: player.IsOriginalReidar,
            IsReidar: player.IsReidar,
            Name: player.Name
          }
          updatedRosterPool.push(newPlayer);
        }
      });
    };

    setPlayerPool(updatedPlayerPool);
    setRosterPool(updatedRosterPool);
  };

  const handleAddPlayerClick = () => {
    const updatedGuestList: PlayerWithId[] = [];
    guestPool.forEach(function (player) {
      updatedGuestList.push(player);
    });

    const generatedId = new Date().getTime().toString();
    const newPlayer: PlayerWithId = {
      Id: generatedId,
      IsDefenseman: false,
      IsLicenseReidar: false,
      IsOriginalReidar: false,
      IsReidar: false,
      Name: ""
    };
    updatedGuestList.push(newPlayer);

    setGuestPool(updatedGuestList);
  };

  const handlePlayerPositionClick = (Id: string) => {
    const updatedGuestList: PlayerWithId[] = [];

    guestPool.forEach(function (player) {
      const newPlayer: PlayerWithId = {
        Id: player.Id,
        IsDefenseman: player.Id === Id ? !player.IsDefenseman : player.IsDefenseman,
        IsLicenseReidar: player.IsLicenseReidar,
        IsOriginalReidar: player.IsOriginalReidar,
        IsReidar: player.IsReidar,
        Name: player.Name
      }
      updatedGuestList.push(newPlayer);
    });

    setGuestPool(updatedGuestList);
  };

  const handlePlayerNameChange = (SetName: string, Id: string) => {
    const updatedGuestList: PlayerWithId[] = [];

    guestPool.forEach(function (player) {
      const newPlayer: PlayerWithId = {
        Id: player.Id,
        IsDefenseman: player.IsDefenseman,
        IsLicenseReidar: player.IsLicenseReidar,
        IsOriginalReidar: player.IsOriginalReidar,
        IsReidar: player.IsReidar,
        Name: player.Id === Id ? SetName : player.Name
      }
      updatedGuestList.push(newPlayer);
    });

    setGuestPool(updatedGuestList);
  };

  const handleGuestRemove = (Id: string) => {
    const updatedGuestList: PlayerWithId[] = [];

    guestPool.forEach(function (player) {
      if (player.Id !== Id) {
        const newPlayer: PlayerWithId = {
          Id: player.Id,
          IsDefenseman: player.IsDefenseman,
          IsLicenseReidar: player.IsLicenseReidar,
          IsOriginalReidar: player.IsOriginalReidar,
          IsReidar: player.IsReidar,
          Name: player.Id
        }
        updatedGuestList.push(newPlayer);
      }
    });

    setGuestPool(updatedGuestList);
  };

  const handleCriteriaChange = (Event: React.ChangeEvent<HTMLInputElement>) => {
    const Input = Event.target.name;
    const Value = Event.target.checked;

    const updatedCriteria: Criteria = {
      Licenses: Input === "Licenses" ? Value : (generationCriteria !== null ? generationCriteria.Licenses : false),
      Ogs: Input === "Ogs" ? Value : (generationCriteria !== null ? generationCriteria.Ogs : false),
      Reidars: Input === "Reidars" ? Value : (generationCriteria !== null ? generationCriteria.Reidars : false),
      Whites: Input === "Whites" ? Value : (generationCriteria !== null ? generationCriteria.Whites : false),
    };

    setGenerationCriteria(updatedCriteria);
    setCriteriaText(FormatCriteriaText(updatedCriteria));
  };

  const handleGenerateClick = () => {
    setActiveStep(4);
    const newRosters: Rosters | null = GenerateRoster(generationCriteria, rosterPool, guestPool);
    setGeneratedRosters(newRosters);
  };

  return (
    <div className="app" data-active={activeStep}>
      <div className='flex-item' id="step1" data-active={activeStep === 1}>
        <h2>Reidars pelaaja-pool</h2>
        <table className="table table1">
          <thead>
            <tr>
              <th>Nimi</th>
              <th>Pelipaikka</th>
              <th>Reidars</th>
              <th>Lisenssi</th>
              <th>OG</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {playerPool.map((player) => (
              <tr key={player.Id} id={`pool-${player.Id}`}>
                <th>{player.Name}</th>
                <td>{player.IsDefenseman ? "D" : "F"}</td>
                <td style={{ color: "blue" }}>{player.IsReidar ? "X" : ""}</td>
                <td style={{ color: "blue" }}>{player.IsLicenseReidar ? "X" : ""}</td>
                <td style={{ color: "blue" }}>{player.IsOriginalReidar ? "X" : ""}</td>
                <td>
                  <button onClick={() => handlePoolPlayerClick(player.Id)} style={{ marginLeft: 20 }}>+</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="back">
          <div />
          <button type="button" onClick={() => setActiveStep(2)}>Jatka ({rosterPool.length + guestPool.length}) &rsaquo;</button>
        </div>
      </div>

      <div className='flex-item' id="step2" data-active={activeStep === 2}>
        <h2>Ilmoittautuneet ({rosterPool.length + guestPool.length})</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Nimi</th>
              <th>Pelipaikka</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rosterPool.map((player) => (
              <tr key={player.Id} id={`roster-${player.Id}`}>
                <th>{player.Name}</th>
                <td>{player.IsDefenseman ? "D" : "F"}</td>
                <td>
                  <button onClick={() => handleRosterPlayerClick(player.Id)}>X</button>
                </td>
              </tr>
            ))}
            {guestPool.map((player) => (
              <tr key={player.Id} id={`roster-${player.Id}`}>
                <th><input type="text" defaultValue={player.Name} onChange={(e) => handlePlayerNameChange(e.target.value, player.Id)} /></th>
                <td><button onClick={() => handlePlayerPositionClick(player.Id)}>{player.IsDefenseman ? "D" : "F"}</button></td>
                <td>
                  <button onClick={() => handleGuestRemove(player.Id)}>X</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>
                <button onClick={() => handleAddPlayerClick()} style={{ marginTop: 10, padding: "4px 16px" }}>Lisää pelaaja</button>
              </td>              
            </tr>
          </tfoot>
        </table>
        <div className="back">
          <button type="button" onClick={() => setActiveStep(1)}>&lsaquo; Takaisin</button>
          <button type="button" onClick={() => setActiveStep(3)}>Jatka ({rosterPool.length + guestPool.length}) &rsaquo;</button>
        </div>
      </div>

      <div className='flex-item' id="step3" data-active={activeStep === 3}>
        <h2>Arvo rosterit <small>({rosterPool.length + guestPool.length} pelaajaa)</small></h2>
        <label className="criteria" style={{ display: "none" }}>
          <input id="reidars" name="Ogs" type="checkbox" onChange={(e) => handleCriteriaChange(e)} />
          OGt samalle puolelle
        </label>
        <label className="criteria">
          <input id="reidars" name="Licenses" type="checkbox" onChange={(e) => handleCriteriaChange(e)} />
          Lisenssireidarit samalle puolelle
        </label>
        <label className="criteria" style={{ display: "none" }}>
          <input id="reidars" name="Reidars" type="checkbox" onChange={(e) => handleCriteriaChange(e)} />
          Reidarit samalle puolelle
        </label>
        <hr />
        <p className="criteriatext">{criteriaText}</p>
        <button className="generate" disabled={(rosterPool.length + guestPool.length) < 2} onClick={() => handleGenerateClick()}>TEE ROSTERIT</button>
        {(rosterPool.length + guestPool.length) < 2 && (<p style={{ color: "red", textAlign: "center" }}><strong>Lisää ensin vähintään kaksi (2) pelaajaa.</strong></p>)}
        <div className="back">
          <button type="button" onClick={() => setActiveStep(2)}>&lsaquo; Takaisin</button>
        </div>
      </div>

      <div className="flex-item" id="step4">
        <h2>Rosterit ({rosterPool.length + guestPool.length} pelaajaa)</h2>
        <div className="roster-container">
          <div>
            <h3 style={{ background: "black", color: "white", fontSize: 18, lineHeight: "18px", marginTop: 40, padding: 10 }}>Musta <small>({generatedRosters?.Black.length})</small></h3>
            <ul>
              {generatedRosters !== null && (
                generatedRosters.Black.map(player => (
                  <li key={player.Id}>{player.Name}</li>
                ))
              )}
            </ul>
          </div>
          <div>
            <h3 style={{ background: "white", color: "black", fontSize: 18, lineHeight: "18px", marginTop: 40, padding: 10 }}>Valkoinen <small>({generatedRosters?.White.length})</small></h3>
            <ul>
              {generatedRosters !== null && (
                generatedRosters.White.map(player => (
                  <li key={player.Id}>{player.Name}</li>
                ))
              )}
            </ul>
          </div>
        </div>
        <div className="back">
          <button type="button" onClick={() => setActiveStep(3)}>&lsaquo; Takaisin</button>
        </div>
      </div>

      <h1 style={{transform: "rotateZ(-2deg)"}}>Torstai Roster <small><strong><i><u>BETA</u></i></strong></small></h1>
    </div>
  )
}

export default App
