import { DriveUser } from './auth';
import store from '@/app/store/panel';
import AuthAC from '@/app/store/auth/actions/AuthAC';
import browser from '@/app/utilities/browser';
import api from '../api/api';
import { IDataResponse } from '@/app/interfaces/IDataResponse';

export const getDriveUser = async (): Promise<IDataResponse<DriveUser>> => {
  return api.get(`/api/v1/drive/user`);
};

export const removeDriveUser = () => {
  browser.storage.local.remove('driveUser');
  store.dispatch(AuthAC.setDriveUser({ driveUser: null }));
};
