import { combineReducers, createStore, applyMiddleware } from 'redux';
import AuthReducer from '../auth/reducers/AuthReducer';
import DriveReducer from '../drive/reducers/DriveReducer';
import PanelReducer from './reducers/PanelReducer';
import { createStateSyncMiddleware, initMessageListener } from 'redux-state-sync';

const reduxStateSyncConfig = {};

export const mainReducer = combineReducers({
  auth: AuthReducer,
  panel: PanelReducer,
  drive: DriveReducer,
});

const store = createStore(
  mainReducer,
  applyMiddleware(createStateSyncMiddleware(reduxStateSyncConfig)),
);

initMessageListener(store)

export default store