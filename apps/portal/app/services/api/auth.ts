import { IDataResponse } from 'app/interfaces/IApiResponse';
import { IUser } from 'app/interfaces/IUserData';
import {
  ITermsAcceptanceClaim,
  ITermsAcceptanceDocument,
} from 'app/interfaces/ITermsAcceptance';
import api from './api';

const signInWithEmailAndPasswordAPI = (
  email: string,
  password: string,
): Promise<IDataResponse> => {
  return api.post(`/api/v1/auth/login`, {
    email,
    password,
  });
};

const signInWithGoogleAPI = (credentials: string): Promise<IDataResponse> => {
  return api.post(`/api/v1/auth/login-google`, { credentials });
};

/**
 * The legal documents a new account must accept, as currently published.
 *
 * Fetched rather than hard-coded so the version and digest the user is shown are
 * the ones the server will accept — and so the object that gates the submit
 * button is the object that gets posted back on submit.
 */
const getRequiredTermsAPI = (
  locale?: string,
): Promise<ITermsAcceptanceDocument[]> => {
  return api
    .get('/api/v1/terms/required', { params: locale ? { locale } : undefined })
    .then((response: any) => response as unknown as ITermsAcceptanceDocument[]);
};

const registerUserEmailPassAPI = (
  email: string,
  password: string,
  username: string,
  /**
   * What the user ticked the box for.
   *
   * `submitHandler` used to call `register(email, password, username)` with the
   * TOS value unreferenced, so this argument — and the request field behind it —
   * simply did not exist. The tick enabled a button and vanished.
   */
  terms?: ITermsAcceptanceClaim[],
): Promise<IDataResponse> => {
  return api.post('/api/v1/auth/register', {
    email,
    password,
    username,
    terms,
  });
};

const updateUserDataAPI = (
  displayName?: string,
  photoURL?: string,
): Promise<IDataResponse<IUser>> => {
  return api.put(`/api/v1/auth/user-data`, { displayName, photoURL });
};

const getUserDataAPI = (): Promise<IDataResponse> => {
  return api.get(`/api/v1/auth/user-data`);
};

const changeUserEmailAPI = (email: string): Promise<IDataResponse> => {
  return api.put(`/api/v1/auth/email`, { email });
};

const changeUserPasswordAPI = (
  email: string,
  oldPassword: string,
  password: string,
): Promise<IDataResponse> => {
  return api.put(`/api/v1/auth/password`, {
    email,
    oldPassword,
    password,
  });
};

const uploadAvatarAPI = (file: File): Promise<any> => {
  const formData = new FormData();

  formData.append('file', file);

  return api.post(`/api/v1/auth/upload-avatar`, formData);
};

const deleteUserAPI = (): Promise<any> => {
  return api.delete(`/api/v1/auth/user`);
};

const logout = (): Promise<void> => {
  //Not used
  return api.delete('/api/v1/auth/logout');
};

/**
 * A one-time nonce for connecting Google Drive. The API also sets a cookie that ties it to this
 * browser, so the request is made with credentials.
 */
const getDriveOAuthState = async (): Promise<string> => {
  // The response interceptor of `api` returns the body: here the nonce itself.
  return await api.get<string, string>(`/api/v1/drive/oauth-state`, {
    withCredentials: true,
  });
};

/** Exchanges the code Google sent back, with the nonce from `getDriveOAuthState` and its cookie. */
const completeOAuth = async (code: string, nonce?: string): Promise<any> => {
  const state = nonce ? `&state=${encodeURIComponent(nonce)}` : '';
  return await api.get(
    `/api/v1/drive/complete-oauth?code=${encodeURIComponent(code)}${state}`,
    { withCredentials: true },
  );
};

const getUserServerSideProps = async (
  refreshToken: string,
  idToken: string,
  baseURL: string,
): Promise<IUser | null> => {
  const response: Response = await fetch(`${baseURL}/api/v1/auth/user-data`, {
    headers: {
      refreshToken,
      idToken,
    },
  });

  const userResponseAPI: any = await response.json();

  if (userResponseAPI.status == 'success') {
    const user: IUser = {
      ...userResponseAPI.data,
    };
    return user;
  } else {
    return null;
  }
};

export {
  signInWithEmailAndPasswordAPI,
  getRequiredTermsAPI,
  registerUserEmailPassAPI,
  updateUserDataAPI,
  uploadAvatarAPI,
  changeUserEmailAPI,
  changeUserPasswordAPI,
  deleteUserAPI,
  getUserDataAPI,
  signInWithGoogleAPI,
  completeOAuth,
  getDriveOAuthState,
  logout,
  getUserServerSideProps,
};
