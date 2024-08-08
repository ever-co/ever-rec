import { combineReducers, createStore } from 'redux';
import AuthReducer from '../auth/reducers/AuthReducer';
import DriveReducer from '../drive/reducers/DriveReducer';
import PanelReducer from './reducers/PanelReducer';

export const mainReducer = combineReducers({
  auth: AuthReducer,
  panel: PanelReducer,
  drive: DriveReducer,
});

export default createStore(mainReducer);
