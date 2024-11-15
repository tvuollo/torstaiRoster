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

    if (isWhiteBigger) {
        newWhite = ShufflePool(newWhite);
        RosterBase.Black.forEach(function (blackPlayer) {
            newBlack.push(blackPlayer);
        });
        RosterBase.White.forEach(function (whitePlayer) {
            let pushThisPlayerToBlack: boolean = false;

            if (Crit.Licenses && whitePlayer.IsLicenseReidar) { pushThisPlayerToBlack = true; }

            if (pushThisPlayerToBlack == true && newBlack.length < RosterBase.White.length) {
                newBlack.push(whitePlayer);
            }
            else {
                newWhite.push(whitePlayer);
            }
        });
        if (newBlack.length < desiredBlackCount) {
            let blackDefenseCount = newBlack.filter((obj) => obj.IsDefenseman === true).length;
            let evenNewerWhite: PlayerWithId[] = [];

            newWhite.forEach(function (whitePlayer) {
                if (blackDefenseCount < 3 && whitePlayer.IsDefenseman && newBlack.length < desiredBlackCount && whitePlayer.IsPermaWhite === undefined) {
                    newBlack.push(whitePlayer);
                    blackDefenseCount++;
                }
                else {
                    evenNewerWhite.push(whitePlayer);
                }
            });

            newWhite = evenNewerWhite;
        }
        if (newBlack.length < desiredBlackCount) {
            let evenNewerWhite: PlayerWithId[] = [];

            newWhite.forEach(function (whitePlayer) {
                if (newBlack.length < desiredBlackCount && whitePlayer.IsPermaWhite === undefined) {
                    newBlack.push(whitePlayer);
                }
                else {
                    evenNewerWhite.push(whitePlayer);
                }
            });

            newWhite = evenNewerWhite;
        }
    }
    else {
        console.log("too many blacks");
        newBlack = ShufflePool(newBlack);
        console.log(newBlack);
        RosterBase.White.forEach(function (whitePlayer) {
            newWhite.push(whitePlayer);
        });
        RosterBase.Black.forEach(function (blackPlayer) {
            console.log("first iteration");
            let pushThisPlayerToWhite: boolean = true;

            if (Crit.Licenses && blackPlayer.IsLicenseReidar) { pushThisPlayerToWhite = false; }

            if (pushThisPlayerToWhite == false && newWhite.length < desiredWhiteCount) {
                newBlack.push(blackPlayer);
            }
            else {
                console.log("push " + blackPlayer.Name);
                newWhite.push(blackPlayer);
            }
        });
        if (newWhite.length < desiredWhiteCount) {
            console.log("second iteration");
            let whiteDefenseCount = newWhite.filter((obj) => obj.IsDefenseman === true).length;
            let evenNewerBlack: PlayerWithId[] = [];

            newBlack.forEach(function (blackPlayer) {
                if (whiteDefenseCount < 3 && blackPlayer.IsDefenseman && newWhite.length < desiredWhiteCount) {
                    newWhite.push(blackPlayer);
                    console.log(whiteDefenseCount);
                    console.log("push " + blackPlayer.Name);
                    whiteDefenseCount++;
                }
                else {
                    evenNewerBlack.push(blackPlayer);
                }
            });

            newBlack = evenNewerBlack;
        }
        if (newWhite.length < desiredWhiteCount) {
            let evenNewerBlack: PlayerWithId[] = [];

            newBlack.forEach(function (blackPlayer) {
                if (newWhite.length < desiredWhiteCount) {
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
    const shuffledPool = ShufflePool(PlayerPool.concat(GuestPool));
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