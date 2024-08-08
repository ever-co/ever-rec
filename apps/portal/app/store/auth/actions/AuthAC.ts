import ActionType from 'app/interfaces/ActionType';
import { DriveUser } from 'app/services/google/auth';
import {
  REMOVE_DROP_BOX_USER,
  REMOVE_JIRA_USER,
  REMOVE_SLACK_USER,
  REMOVE_TRELLO_USER,
  SET_DRIVE_USER,
  SET_TRELLO_USER,
  SET_USER,
} from './actionTypes';
import { IAtlassian, IUser } from '../../../interfaces/IUserData';

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

  static removeSlackUser(): ActionType {
    return { type: REMOVE_SLACK_USER, payload: false };
  }

  static removeDropboxUser(): ActionType {
    return { type: REMOVE_DROP_BOX_USER, payload: false };
  }

  static removeJiraUser({
    payload,
  }: {
    payload: IAtlassian | null;
  }): ActionType {
    return { type: REMOVE_JIRA_USER, payload };
  }

  static removeTrelloUser({
    payload,
  }: {
    payload: IAtlassian | null;
  }): ActionType {
    return { type: REMOVE_TRELLO_USER, payload };
  }

  static setTrelloUser({
    payload,
  }: {
    payload: IAtlassian | null;
  }): ActionType {
    return { type: SET_TRELLO_USER, payload };
  }
}
