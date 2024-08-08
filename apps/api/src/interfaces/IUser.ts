import firebase from 'firebase/compat';
import OAuthCredential = firebase.auth.OAuthCredential;
import { IFavoriteFolders } from './Folders';

export interface IUser {
  id?: string;
  displayName?: string;
  photoURL?: string;
  email?: string;
  slackToken?: string;
  googleCredentials?: OAuthCredential;
  whiteboardIds?: string[];
  workspaceIds?: string[];
  favoriteFolders?: IFavoriteFolders;
}

export interface IUserShort {
  id: string;
  displayName: string;
  photoURL: string;
  email: string;
}

export interface ITokens {
  idToken: string;
  refreshToken: string;
}
