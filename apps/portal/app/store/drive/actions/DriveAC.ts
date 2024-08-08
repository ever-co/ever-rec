import ActionType from 'app/interfaces/ActionType';
import { DriveFile } from 'app/services/google/drive';
import { SET_DRIVE_FOLDERS, SET_WORKING_FOLDER } from './actionTypes';

export default class DriveAC {
  static setFolders({ folders }: { folders: DriveFile[] }): ActionType {
    return { type: SET_DRIVE_FOLDERS, payload: folders };
  }

  static setWorkingFolder({
    workingFolder,
  }: {
    workingFolder: DriveFile | null;
  }): ActionType {
    return { type: SET_WORKING_FOLDER, payload: workingFolder };
  }
}
