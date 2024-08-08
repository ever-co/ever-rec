import ActionType from 'app/interfaces/ActionType';
import { SET_WHITEBOARDS, ADD_WHITEBOARD, SET_LOADING } from './actionTypes';
import { IWhiteboard } from 'app/interfaces/IWhiteboard';

export default class WhiteboardAC {
  static setWhiteboards({
    whiteboards,
  }: {
    whiteboards: IWhiteboard[];
  }): ActionType {
    return { type: SET_WHITEBOARDS, payload: whiteboards };
  }

  static addWhiteboard({
    whiteboard,
  }: {
    whiteboard: IWhiteboard;
  }): ActionType {
    return { type: ADD_WHITEBOARD, payload: whiteboard };
  }

  static setLoading(loading: boolean): ActionType {
    return { type: SET_LOADING, payload: loading };
  }
}
