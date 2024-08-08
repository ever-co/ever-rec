import { combineReducers, createStore } from 'redux';
import AuthReducer from '../auth/reducers/AuthReducer';
import DriveReducer from '../drive/reducers/DriveReducer';
import PanelReducer from './reducers/PanelReducer';
import WhiteboardReducer from '../whiteboard/reducers/WhiteboardReducer';

export const mainReducer = combineReducers({
  auth: AuthReducer,
  panel: PanelReducer,
  whiteboard: WhiteboardReducer,
  drive: DriveReducer,
});

export default createStore(mainReducer);
