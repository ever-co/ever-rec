import ActionType from 'app/interfaces/ActionType';
import { SET_DRIVE_USER, SET_USER } from '../actions/actionTypes';

const initState = {
  user: null,
  authStateChanged: false,
  driveUser: null,
};

export default function AuthReducer(state = initState, action: ActionType) {
  switch (action.type) {
    case SET_USER:
      return { ...state, user: action.payload, authStateChanged: true };
    case SET_DRIVE_USER:
      return { ...state, driveUser: action.payload };
    default:
      return state;
  }
}
