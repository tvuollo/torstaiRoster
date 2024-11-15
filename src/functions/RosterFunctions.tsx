import { PlayerWithId } from "../types/Player";
import { Criteria } from "../types/Criteria";
import { Rosters } from "../types/Rosters";

const ShufflePool = (Pool: PlayerWithId[]) => {
    const shuffledPool = Pool
        .map(Id => ({ Id, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ Id }) => Id);
    return shuffledPool;
};

const SortPool = function (a: PlayerWithId, b: PlayerWithId) {
    if (a.Name === undefined || b.Name === undefined) {
        return 0;
    }
    if (a.Name < b.Name) {
        return -1;
    }
    if (a.Name > b.Name) {
        return 1;
    }
    return 0;
};

const BalanceRosters = (Crit: Criteria, RosterBase: Rosters) => {
    let balancedRosters = RosterBase;
    const isWhiteBigger = RosterBase.White.length > RosterBase.Black.length;
    const desiredBlackCount = (Math.round((RosterBase.Black.length + RosterBase.White.length) / 2));
    const desiredWhiteCount = desiredBlackCount || desiredBlackCount - 1;
    let newBlack: PlayerWithId[] = [];
    let newWhite: PlayerWithId[] = [];

    // If white has more
    if (isWhiteBigger) {
        newWhite = ShufflePool(newWhite);
        RosterBase.Black.forEach(function (blackPlayer) {
            newBlack.push(blackPlayer);
        });
        // First go through criteria
        RosterBase.White.forEach(function (whitePlayer) {
            let pushThisPlayerToBlack: boolean = false;

            if (Crit.Licenses && whitePlayer.IsLicenseReidar) { pushThisPlayerToBlack = true; }

            if (pushThisPlayerToBlack == true && newBlack.length < desiredBlackCount) {
                newBlack.push(whitePlayer);
            }
            else {
                newWhite.push(whitePlayer);
            }
        });
        // Even out defense first
        if (newBlack.length < desiredBlackCount) {
            let blackDefenseCount = newBlack.filter((obj) => obj.IsDefenseman === true).length;
            let evenNewerWhite: PlayerWithId[] = [];

            newWhite.forEach(function (whitePlayer) {
                if (blackDefenseCount < 3 && whitePlayer.IsDefenseman && newBlack.length < desiredBlackCount && whitePlayer.IsPermaWhite !== true) {
                    newBlack.push(whitePlayer);
                    blackDefenseCount++;
                }
                else {
                    evenNewerWhite.push(whitePlayer);
                }
            });

            newWhite = evenNewerWhite;
        }
        // Finish with forwards
        if (newBlack.length < desiredBlackCount) {
            let evenNewerWhite: PlayerWithId[] = [];

            newWhite.forEach(function (whitePlayer) {
                if (newBlack.length < desiredBlackCount && whitePlayer.IsPermaWhite !== true) {
                    newBlack.push(whitePlayer);
                }
                else {
                    evenNewerWhite.push(whitePlayer);
                }
            });

            newWhite = evenNewerWhite;
        }
    }
    // If black has more
    else {
        RosterBase.White.forEach(function (whitePlayer) {
            newWhite.push(whitePlayer);
        });
        // Go through criteria first
        RosterBase.Black.forEach(function (blackPlayer) {
            let pushThisPlayerToWhite: boolean = true;

            if (Crit.Licenses && blackPlayer.IsLicenseReidar) { pushThisPlayerToWhite = false; }

            if (pushThisPlayerToWhite == false && newWhite.length < desiredWhiteCount) {
                newBlack.push(blackPlayer);
            }
            else {
                newWhite.push(blackPlayer);
            }
        });
        // Even out defense first
        if (newWhite.length < desiredWhiteCount) {
            let whiteDefenseCount = newWhite.filter((obj) => obj.IsDefenseman === true).length;
            let evenNewerBlack: PlayerWithId[] = [];

            newBlack.forEach(function (blackPlayer) {
                if (whiteDefenseCount < 3 && blackPlayer.IsDefenseman && newWhite.length < desiredWhiteCount) {
                    newWhite.push(blackPlayer);
                    whiteDefenseCount++;
                }
                else {
                    evenNewerBlack.push(blackPlayer);
                }
            });

            newBlack = evenNewerBlack;
        }
        // Finish with forwards
        if (newWhite.length < desiredWhiteCount) {
            let evenNewerBlack: PlayerWithId[] = [];

            newBlack.forEach(function (blackPlayer) {
                if (blackPlayer.IsDefenseman == false && newWhite.length < desiredWhiteCount) {
                    newWhite.push(blackPlayer);
                }
                else {
                    evenNewerBlack.push(blackPlayer);
                }
            });

            newBlack = evenNewerBlack;
        }
    }

    balancedRosters.Black = newBlack;
    balancedRosters.White = newWhite;

    return balancedRosters;
};

export const GenerateRoster = (Crit: Criteria, PlayerPool: PlayerWithId[], GuestPool: PlayerWithId[]) => {
    let counter: boolean = false;
    const poolToShuffle = PlayerPool.concat(GuestPool);
    const shuffledPool = ShufflePool(poolToShuffle);
    const defensePool: PlayerWithId[] = [];
    const forwardPool: PlayerWithId[] = [];
    let RosterBase: Rosters = {
        Black: [],
        White: []
    };

    shuffledPool.forEach(function (player) {
        if (player.IsDefenseman) {
            defensePool.push(player);
        }
        else {
            forwardPool.push(player);
        };
    });

    if (!Crit.Licenses) {
        defensePool.forEach(function (player) {
            if (counter === false) {
                RosterBase.Black.push(player);
            }
            else {
                RosterBase.White.push(player);
            }
            counter = !counter;
        });

        forwardPool.forEach(function (player) {
            if (counter === false) {
                RosterBase.Black.push(player);
            }
            else {
                RosterBase.White.push(player);
            }
            counter = !counter;
        });
    }

    if (Crit.Licenses === true) {
        defensePool.forEach(function (player) {
            player.IsLicenseReidar ? RosterBase.Black.push(player) : RosterBase.White.push(player);
        });
        forwardPool.forEach(function (player) {
            player.IsLicenseReidar ? RosterBase.Black.push(player) : RosterBase.White.push(player);
        });

        if (RosterBase.Black.length - RosterBase.White.length > 1 ||
            RosterBase.White.length - RosterBase.Black.length > 0
        ) {
            RosterBase = BalanceRosters(Crit, RosterBase);
        }
    }

    RosterBase.Black.sort(SortPool);
    RosterBase.White.sort(SortPool);

    return RosterBase;
};