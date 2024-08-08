import ActionType from '@/app/interfaces/ActionType';
import { DriveUser } from '@/app/services/google/auth';
import { REMOVE_DROP_BOX_USER, REMOVE_JIRA_USER, REMOVE_SLACK_USER, REMOVE_TRELLO_USER, SET_DRIVE_USER, SET_TRELLO_USER, SET_USER } from './actionTypes';
import { IAtlassian, IUser } from '@/app/interfaces/IUserData';


export default class AuthAC {
  static setUser({ user }: { user: IUser | null }): ActionType {
    return { type: SET_USER, payload: user };
  }

  static setDriveUser({
    driveUser,
  }: {
    driveUser: DriveUser | null;
  }): ActionType {
    return { type: SET_DRIVE_USER, payload: driveUser };
  }

  static removeSlackUser({
    user,
  }: {
    user: IUser | null;
  }): ActionType {
    return { type: REMOVE_SLACK_USER, payload: user };
  }

  static removeDropboxUser({
    user,
  }: {
    user: IUser | null;
  }): ActionType {
    return { type: REMOVE_DROP_BOX_USER, payload: user };
  }

  static removeJiraUser({
    user,
  }: {
    user: IUser | null;
  }): ActionType {
    return { type: REMOVE_JIRA_USER, payload: user };
  }
  
  static removeTrelloUser({
    user,
  }: {
    user: IUser | null;
  }): ActionType {
    return { type: REMOVE_TRELLO_USER, payload: user };
  }
  static setTrelloUser({
    payload,
  }: {
    payload: IAtlassian;
  }): ActionType {
    return { type: SET_TRELLO_USER, payload };
  }
}
