import { IFavoriteFolders } from 'app/interfaces/Folders';

export interface IUser {
  id: string;
  email: string;
  favoriteFolders?: IFavoriteFolders;
  provider?: string;
  displayName?: string;
  photoURL?: string;
  isSlackIntegrate?: boolean;
  dropbox?: any;
  jira?: IAtlassian;
  trello?: IAtlassian;
}

export interface IUserShort {
  id: string;
  displayName: string;
  photoURL: string;
  email: string;
}

export interface IAtlassian {
  isIntegrated: boolean;
  url?: string;
  email?: string;
}

export interface ITokens {
  idToken: string;
  refreshToken: string;
}

export interface IUserData {
  id?: string;
  idToken: string;
  refreshToken: string;
  displayName?: string;
  email: string;
  photoURL?: string;
  message?: string;
  isSlackIntegrate?: boolean;
  dropbox?: any;
  jira?: IAtlassian;
  trello?: IAtlassian;
  isNewUser?: boolean;
  favoriteFolders: IFavoriteFolders;
}
