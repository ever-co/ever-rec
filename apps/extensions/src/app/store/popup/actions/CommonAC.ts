import ActionType from '@/app/interfaces/ActionType';
import { AppRoute } from '@/content/popup/routes/app.route';
import {
  CHANGE_ACTIVE_ROUTE,
  CHANGE_ACTIVE_URL,
  SET_CAPTURING_TIME,
  SET_RECORDING_VIDEO,
} from './actionTypes';

export default class CommonAC {
  static setActiveRoute({
    activeRoute,
  }: {
    activeRoute: AppRoute;
  }): ActionType {
    return { type: CHANGE_ACTIVE_ROUTE, payload: activeRoute };
  }

  static setActiveUrl({ activeUrl }: { activeUrl: string }): ActionType {
    return { type: CHANGE_ACTIVE_URL, payload: activeUrl };
  }

  static setCapturingTime({
    capturingTime,
  }: {
    capturingTime: string | null;
  }): ActionType {
    return { type: SET_CAPTURING_TIME, payload: capturingTime };
  }

  static setRecordingVideo(recording: any): ActionType {
    return { type: SET_RECORDING_VIDEO, payload: recording };
  }
}
