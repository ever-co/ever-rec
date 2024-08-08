import { ItemActionsEnum } from "../enums/itemActionsEnum";

export interface ITrelloData {
    boards: any[];
}

export interface IShareItemSelected {
    id?: string | null;
    type?: string | null;
    provider: ItemActionsEnum | null;
    item?: any;
}

export interface IAtlassianSaveItem {
    itemId: string,
    itemType: string,
    projectId: string,
    issueType: string,
    description: string,
    title: string,
    resourceId?: string,
}