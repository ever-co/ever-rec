import ActionType from '@/app/interfaces/ActionType';
import {
  REMOVE_DROP_BOX_USER,
  REMOVE_JIRA_USER,
  REMOVE_SLACK_USER,
  REMOVE_TRELLO_USER,
  SET_DRIVE_USER,
  SET_TRELLO_USER,
  SET_USER,
} from '../actions/actionTypes';

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
    case REMOVE_SLACK_USER:
      return { ...state, user: action.payload };
    case REMOVE_DROP_BOX_USER:
      return { ...state, user: action.payload };
    case REMOVE_JIRA_USER:
      return { ...state, user: action.payload };
    case SET_TRELLO_USER:
      return { ...state, user: action.payload };
    case REMOVE_TRELLO_USER:
      return { ...state, user: action.payload };
    default:
      return state;
  }
}
