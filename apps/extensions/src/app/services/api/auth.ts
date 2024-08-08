import api from './api';
import { IUser } from '@/app/interfaces/IUserData';
import { IDataResponse } from '@/app/interfaces/IDataResponse';

const signInWithEmailAndPasswordAPI = (
  email: string,
  password: string,
): Promise<IDataResponse> => {
  return api.post(`/api/v1/auth/login`, {
    email,
    password,
  });
};

const registerUser = (email: string, password: string) => {
  return api.post('/api/v1/auth/register', {
    email,
    password,
  });
};

const logout = (): Promise<void> => {
  return api.delete('/api/v1/auth/logout');
};

const updateUserDataAPI = (
  displayName?: string,
  photoURL?: string,
): Promise<any> => {
  return api.put(`/api/v1/auth/user-data`, { displayName, photoURL });
};

const uploadAvatarAPI = (file: File): Promise<any> => {
  const formData = new FormData();

  formData.append('file', file);

  return api.post(`/api/v1/auth/upload-avatar`, formData);
};

const deleteUserAPI = () => {
  return api.delete(`/api/v1/auth/user`);
};

const changeUserPasswordAPI = (
  email: string,
  oldPassword: string,
  newPassword: string,
): Promise<IDataResponse> => {
  return api.put(`/api/v1/auth/update-pass`, {
    email,
    oldPassword,
    newPassword,
  });
};

const changeUserEmailAPI = (email: string): Promise<IDataResponse> => {
  return api.put(`/api/v1/auth/update-email`, { email });
};

export {
  signInWithEmailAndPasswordAPI,
  registerUser,
  logout,
  updateUserDataAPI,
  changeUserPasswordAPI,
  uploadAvatarAPI,
  deleteUserAPI,
  changeUserEmailAPI,
};
