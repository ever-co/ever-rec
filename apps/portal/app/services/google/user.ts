import axios from 'axios';
import { DriveUser, getDriveToken } from './auth';
import store from 'app/store/panel';
import AuthAC from 'app/store/auth/actions/AuthAC';
import { getDriveData } from './drive';
import { sendExternalMessage } from '../../../misc/_helper';
import api from '../api/api';

// const api = axios.create({
//   baseURL: 'https://www.googleapis.com',
//   responseType: 'json',
// });
//
// api.interceptors.request.use(
//   async (config) => {
//     const driveToken = await getDriveToken();
//     config.params.access_token = driveToken?.access_token;
//     return config;
//   },
//   (error) => {
//     Promise.reject(error);
//   },
// );
//
// api.interceptors.response.use(
//   (response) => {
//     return response.data;
//   },
//   async (error) => {
//     const originalRequest = error.config;
//     if (
//       error.response.status === 401 &&
//       !originalRequest._retry &&
//       originalRequest.params.catchUnauthorized
//     ) {
//       store.dispatch(AuthAC.setDriveUser({ driveUser: null }));
//       originalRequest._retry = true;
//       const driveToken = await googleAuthentication();
//       originalRequest.params.access_token = driveToken.access_token;
//       return api(originalRequest);
//     }
//     return Promise.reject(error);
//   },
// );

// export const getDriveUser = async (
//   catchUnauthorized = false,
// ): Promise<DriveUser | undefined> => {
//   try {
//     const driveUser: DriveUser = await api.get(`/oauth2/v2/userinfo`);
//
//     if (driveUser) {
//       store.dispatch(AuthAC.setDriveUser({ driveUser }));
//       await getDriveData();
//       return driveUser;
//     }
//   } catch (e: any) {
//     console.log(e);
//   }
// };

export const getDriveUser = async (): Promise<any> => {
  return api.get(`/api/v1/drive/user`);
};

export const setDriveUser = (driveUser: DriveUser) => {
  store.dispatch(AuthAC.setDriveUser({ driveUser }));
  sendExternalMessage('setDriveUser', driveUser);
};

export const removeDriveUser = () => {
  store.dispatch(AuthAC.setDriveUser({ driveUser: null }));
  sendExternalMessage('setDriveUser', null);
};
