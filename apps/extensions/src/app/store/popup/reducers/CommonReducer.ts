import ActionType from '@/app/interfaces/ActionType';
import {
  CHANGE_ACTIVE_ROUTE,
  CHANGE_ACTIVE_URL,
  SET_CAPTURING_TIME,
  SET_RECORDING_VIDEO,
} from '../actions/actionTypes';

const initState = {
  activeUrl: '',
  capturingTime: null,
  recording: null,
};

export default function CommonReducer(state = initState, action: ActionType) {
  switch (action.type) {
    case CHANGE_ACTIVE_ROUTE:
      return { ...state, activeRoute: action.payload };
    case CHANGE_ACTIVE_URL:
      return { ...state, activeUrl: action.payload };
    case SET_CAPTURING_TIME:
      return { ...state, capturingTime: action.payload };
    case SET_RECORDING_VIDEO:
      return { ...state, recording: action.payload };
    default:
      return state;
  }
}
