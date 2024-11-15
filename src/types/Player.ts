export interface Player {
    IsDefenseman: boolean;
    IsLicenseReidar: boolean;
    IsOriginalReidar: boolean;
    IsPermaWhite?: boolean;
    IsReidar: boolean;
    Name: string;
}

export interface PlayerWithId extends Player {
    Id: string;
}