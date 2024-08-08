import { combineReducers, createStore } from 'redux';
import AuthReducer from '../auth/reducers/AuthReducer';
import CommonReducer from './reducers/CommonReducer';


export const mainReducer = combineReducers({
    common: CommonReducer,
    auth: AuthReducer,
});

export default createStore(mainReducer);