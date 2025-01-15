import { message } from 'antd';
import { errorHandler } from './helpers/errors';
import { splitFilename } from '../utilities/common';
import { getStorageItems, setStorageItems } from './localStorage';
import IPreferences from '../interfaces/IPreferences';
import {
  getUserTokens,
  handleResponse,
  parseUserData,
  sendExternalMessage,
  storeUserTokens,
} from '../../misc/_helper';
import {
  changeUserEmailAPI,
  changeUserPasswordAPI,
  deleteUserAPI,
  getUserDataAPI,
  registerUserEmailPassAPI,
  signInWithEmailAndPasswordAPI,
  signInWithGoogleAPI,
  updateUserDataAPI,
  uploadAvatarAPI,
} from './api/auth';
import { ITokens, IUser, IUserData } from '../interfaces/IUserData';
import cookie from 'js-cookie';
import { CredentialResponse } from '@react-oauth/google';
import { IDataResponse } from 'app/interfaces/IApiResponse';
import { removeCookies } from './helpers/getCookies';
import {
  newPasswordAPI,
  sendEmailResetPasswordAPI,
  sendWelcomeEmailAPI,
  verifyPasswordResetCodeAPI,
} from './api/email';
import { errorMessage, successMessage } from './helpers/toastMessages';
import { iDataResponseParser } from './helpers/iDataResponseParser';

const processUserData = (userData: IUserData | null): IUser | null => {
  if (userData?.idToken && userData?.refreshToken) {
    storeUserTokens(userData);

    return parseUserData(userData);
  } else {
    return null;
  }
};

const updateExtensionAuthData = (tokens: ITokens) => {
  const action = tokens.idToken && tokens.refreshToken ? 'signIn' : 'signOut';
  sendExternalMessage(action, tokens);
};

export const login = async (
  email: string,
  password: string,
  processInformation = true, // sometimes we need login only for confirmation purposes
): Promise<IDataResponse> => {
  const response: IDataResponse = await signInWithEmailAndPasswordAPI(
    email,
    password,
  );

  if (response.status === 'success' && processInformation) {
    handleResponse(response);
    updateExtensionAuthData(response.data as IUserData);
    processUserData(response.data as IUserData);
  }

  return response;
};

export const register = async (
  email: string,
  password: string,
  username = '',
): Promise<IDataResponse> => {
  const response: IDataResponse = await registerUserEmailPassAPI(
    email,
    password,
    username,
  );

  if (response.status === 'success') {
    const userData = response.data as IUserData;
    updateExtensionAuthData(userData);
    processUserData(userData);
    handleResponse(response);

    try {
      await sendWelcomeEmailAPI(userData.email);
    } catch (e) {
      console.error(e);
    }
  }

  return response;
};

export const googleAuthorization = async (
  credsResponse: CredentialResponse,
): Promise<IDataResponse> => {
  const response: IDataResponse = await signInWithGoogleAPI(
    credsResponse.credential as string,
  );

  if (response.status == 'success') {
    const userData = response.data as IUserData;
    updateExtensionAuthData(userData);
    processUserData(userData);
    handleResponse(response);

    if (response.data.isNewUser) {
      const userData = response.data as IUserData;
      try {
        await sendWelcomeEmailAPI(userData.email);
      } catch (e) {
        console.error(e);
      }
    }
  }

  return response;
};

export const signOut = (skipMessage?: boolean) => {
  removeCookies(); // removes tokens
  localStorage.removeItem('driveUser');

  !skipMessage &&
    updateExtensionAuthData({ idToken: null, refreshToken: null } as any);
};

export const updateUserDataFromTokens = async (): Promise<IUser | null> => {
  const refreshToken = cookie.get('refreshToken');
  const idToken = cookie.get('idToken');

  if (idToken && refreshToken) {
    const userDataFromAPI: IDataResponse = await getUserDataAPI();

    console.log(userDataFromAPI);

    const userData: IUserData = {
      ...userDataFromAPI.data,
      idToken,
      refreshToken,
    };

    updateExtensionAuthData(userData);
    return processUserData(userData);
  } else {
    updateExtensionAuthData({ idToken: null, refreshToken: null } as any);
    return null;
  }
};

export const resetUserEmail = async (email: string): Promise<void> => {
  try {
    const result = await sendEmailResetPasswordAPI(email);
    if (result.status === 'error') {
      errorMessage(result.message);
    } else {
      successMessage(result.message);
    }
  } catch (error: any) {
    console.log(error);
    errorHandler(error);
  }
};

export const verifyPasswordResetCode = async (
  oobCode: string,
): Promise<IDataResponse> => {
  const result = await verifyPasswordResetCodeAPI(oobCode);

  return result;
};

export const newPassword = async (
  oobCode: string,
  newPassword: string,
): Promise<IDataResponse> => {
  const result = await newPasswordAPI(oobCode, newPassword);
  return result;
};

export const updateUserData = async ({
  displayName,
  photoURL,
}: {
  displayName?: string;
  photoURL?: string;
}) => {
  const res = await updateUserDataAPI(displayName, photoURL);
  const data = iDataResponseParser<typeof res.data>(res, false);
  data && sendExternalMessage('updateUserData', data);
  return data;
};

export const uploadAvatar = async (avatar: File): Promise<string | null> => {
  const filename: { name: string; ext: string } = splitFilename(avatar.name);

  if (filename.ext && ['jpg', 'jpeg', 'png'].includes(filename.ext)) {
    try {
      const { data } = await uploadAvatarAPI(avatar);

      sendExternalMessage('updateUserData', data.photoURL);

      return data.photoURL;
    } catch (error: any) {
      errorHandler(error);
      return null;
    }
  } else {
    message.error('This file type is not supported.');
  }

  return null;
};

export const changeUserEmail = async (
  newEmail: string,
): Promise<IDataResponse> => {
  return await changeUserEmailAPI(newEmail);
};

export const changeUserPassword = async (
  email: string,
  oldPassword: string,
  newPassword: string,
) => {
  return await changeUserPasswordAPI(email, oldPassword, newPassword);
};

export const deleteUser = async (): Promise<void> => {
  const result = await deleteUserAPI();
  return result;
};

// TODO refactor
export const getPreferences = async (): Promise<IPreferences | undefined> => {
  const tokens: ITokens | null = getUserTokens();

  if (tokens) {
    try {
      const res = await getStorageItems('preferences');
      return res.preferences as IPreferences;
    } catch (e: any) {
      console.log(e);
      errorHandler(e);
    }
  }
};

// TODO refactor
export const setPreferences = async (
  preferences: IPreferences,
): Promise<void> => {
  const tokens: ITokens | null = getUserTokens();

  if (tokens) {
    try {
      await setStorageItems({ preferences });
    } catch (e: any) {
      console.log(e);
      errorHandler(e);
    }
  }
};
