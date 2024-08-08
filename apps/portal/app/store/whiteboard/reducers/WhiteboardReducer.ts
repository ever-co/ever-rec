import ActionType from 'app/interfaces/ActionType';
import {
  SET_WHITEBOARDS,
  ADD_WHITEBOARD,
  SET_LOADING,
} from '../actions/actionTypes';

const initState = {
  whiteboards: [],
  loading: false,
};

export default function WhiteboardReducer(
  state = initState,
  action: ActionType,
) {
  switch (action.type) {
    case SET_WHITEBOARDS:
      return {
        ...state,
        whiteboards: action.payload,
      };

    case ADD_WHITEBOARD:
      return {
        ...state,
        whiteboards: state.whiteboards.concat(action.payload),
      };

    case SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };

    default:
      return state;
  }
}
