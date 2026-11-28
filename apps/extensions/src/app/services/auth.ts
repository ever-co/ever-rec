import { errorHandler } from './helpers/errors';
import { getStorageItems, setStorageItems } from './localStorage';
import IPreferences from '../interfaces/IPreferences';
import {
  changeUserEmailAPI,
  changeUserPasswordAPI,
  deleteUserAPI,
  signInWithEmailAndPasswordAPI,
  updateUserDataAPI,
  uploadAvatarAPI,
} from '@/app/services/api/auth';
import { splitFilename } from '@/app/utilities/common';
import { message } from 'antd';
import { IDataResponse, ResStatusEnum } from '@/app/interfaces/IDataResponse';
import { iDataResponseParser } from './helpers/iDataResponseParser';
import { IUser } from '../interfaces/IUserData';

// TODO: delete
export const createUserWithCreds = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<void> => {
  // dummmy, moved to website
};

export const signInWithEmailAndPassword = (email: string, password: string) => {
  return signInWithEmailAndPasswordAPI(email, password);
};

// TODO: delete
export const signinUserWithCreds = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<void> => {
  // dummmy, moved to website
};

// TODO: delete
export const googleAuthorization = async (): Promise<void> => {
  // dummmy, moved to website
};

// TODO: delete
export const googleAuthorizationWithCredential = async (
  credential: any,
): Promise<void> => {
  // dummmy, moved to website
};

export const signOutUser = async (): Promise<void> => {
  // dummmy, moved to website
};

export const resetUserEmail = async (email: string): Promise<void> => {
  // dummmy, moved to website
};

export const updateUserData = async ({
  displayName,
  photoURL,
}: {
  displayName?: string;
  photoURL?: string;
}): Promise<IUser | null> => {
  const res = await updateUserDataAPI(displayName, photoURL);
  const data = iDataResponseParser<typeof res.data>(res, false);
  return data;
};

export const uploadAvatar = async (
  avatar: File,
): Promise<IDataResponse | null> => {
  const filename: { name: string; ext: string } = splitFilename(avatar.name);

  if (filename.ext && ['jpg', 'jpeg', 'png'].includes(filename.ext)) {
    try {
      return await uploadAvatarAPI(avatar);
    } catch (error: any) {
      errorHandler(error);
    }
  } else {
    message.error('This file type is not supported.');
  }
  return null;
};

const addUserToDb = async (user: any): Promise<string> => {
  // dummmy, moved to website
  return '';
};

// export const changeUserEmail = async (newEmail: string): Promise<string | null> => {
//   const result: IDataResponse = await changeUserEmailAPI(newEmail);

//   if (result.status === 'error') {
//     errorHandler({ message: result.message });
//     return null
//   } else {
//     return result.data.email
//   }
// };

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

export const refreshUser = async (credential?: any): Promise<void> => {
  // dummmy, moved to website
};

/**
 * Deletes the signed-in account. The API answers a failure with HTTP 200 and status "error": the
 * account is then not deleted, or not fully (deleting it again finishes it). `refusal` is the API's
 * message when it refused, deleting nothing, because the account is the admin of a workspace (the
 * message names the workspaces), for the person to read.
 */
export const deleteUser = async (): Promise<{
  deleted: boolean;
  refusal?: string;
}> => {
  const response: IDataResponse<null> = await deleteUserAPI();
  if (response?.status === ResStatusEnum.success) return { deleted: true };
  const refusal =
    (response?.error as { code?: unknown } | null)?.code ===
      'workspace_admin' && typeof response?.message === 'string'
      ? response.message
      : undefined;
  return refusal ? { deleted: false, refusal } : { deleted: false };
};

export const deleteFilesInDirectory = async (
  directoryRef: any,
): Promise<void> => {
  // dummmy, moved to website
};

export const getPreferences = async (): Promise<IPreferences | undefined> => {
  const uid: string | undefined = 'firebaseAuth.currentUser?.uid';
  if (uid) {
    try {
      const res = await getStorageItems('preferences');
      return res.preferences as IPreferences;
    } catch (e: any) {
      errorHandler(e);
    }
  }
};

export const setPreferences = async (
  preferences: IPreferences,
): Promise<void> => {
  const uid: string | undefined = 'firebaseAuth.currentUser?.uid';
  if (uid) {
    try {
      await setStorageItems({
        preferences,
      });
    } catch (e: any) {
      errorHandler(e);
    }
  }
};
