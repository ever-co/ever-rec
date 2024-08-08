import ActionType from 'app/interfaces/ActionType';
import { DriveUser } from 'app/services/google/auth';
import { SET_DRIVE_USER, SET_USER } from './actionTypes';
import { IUser } from 'app/interfaces/IUserData';

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
}
