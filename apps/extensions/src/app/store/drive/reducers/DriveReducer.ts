import ActionType from '@/app/interfaces/ActionType';
import { SET_DRIVE_FOLDERS, SET_WORKING_FOLDER } from '../actions/actionTypes';

const initState = {
  folders: [],
  workingFolder: null,
};

export default function DriveReducer(state = initState, action: ActionType) {
  switch (action.type) {
    case SET_DRIVE_FOLDERS:
      return { ...state, folders: action.payload };
    case SET_WORKING_FOLDER:
      return { ...state, workingFolder: action.payload };
    default:
      return state;
  }
}
