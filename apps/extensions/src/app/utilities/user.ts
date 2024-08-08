import { getStorageItems, removeStorageItems } from '../services/localStorage';
import jwt_decode from 'jwt-decode';
import store from '@/app/store/panel';
import AuthAC from '../store/auth/actions/AuthAC';
import { IUser } from '../interfaces/IUserData';
import { getDriveUser } from '@/app/services/google/user';
import { ResStatusEnum } from '../interfaces/IDataResponse';
import PanelAC from '../store/panel/actions/PanelAC';

export const updateUserAuthAC = async (): Promise<void> => {
  try {
    const storage = await getStorageItems([
      'idToken',
      'photoURL',
      'displayName',
      'email',
      'isSlackIntegrate',
      'driveUser',
      'dropbox',
      'jira',
      'trello',
      'favoriteFolders',
    ]);
    const decodedToken: any = jwt_decode(storage.idToken);
    const provider = decodedToken.firebase.sign_in_provider;

    store.dispatch(
      AuthAC.setUser({
        user: {
          email: storage.email,
          id: decodedToken.user_id,
          photoURL: storage.photoURL,
          displayName: storage.displayName,
          provider,
          isSlackIntegrate: storage.isSlackIntegrate,
          dropbox: storage.dropbox,
          jira: storage.jira,
          trello: storage.trello,
        },
      }),
    );

    storage.favoriteFolders &&
      store.dispatch(
        PanelAC.setFavoriteFolders({
          folders: {
            images: storage.favoriteFolders.images || [],
            videos: storage.favoriteFolders.videos || [],
            workspaces: storage.favoriteFolders.workspaces || {},
          },
        }),
      );

    if (storage.driveUser) {
      store.dispatch(
        AuthAC.setDriveUser({
          driveUser: storage.driveUser,
        }),
      );
    } else {
      const driveUser = await getDriveUser();

      if (driveUser.status !== ResStatusEnum.error) {
        chrome.storage.local.set({ driveUser: driveUser.data });
        store.dispatch(
          AuthAC.setDriveUser({
            driveUser: storage.driveUser,
          }),
        );
      }
    }
  } catch (error: any) {
    console.log(error);

    if (error?.message.includes('Invalid token specified')) {
      await removeStorageItems(['idToken', 'refreshToken']);
    }
  }
};

export const getUserFromStore = async (): Promise<IUser | null> => {
  const storage = await getStorageItems([
    'idToken',
    'photoURL',
    'displayName',
    'email',
    'isSlackIntegrate',
    'dropbox',
    'jira',
    'trello',
  ]);
  if (!storage.idToken) return null;
  const decodedToken: any = jwt_decode(storage.idToken);

  return {
    id: decodedToken.user_id,
    email: storage.email,
    photoURL: storage.photoURL,
    displayName: storage.displayName,
    isSlackIntegrate: storage.isSlackIntegrate,
    provider: decodedToken.firebase.sign_in_provider,
    dropbox: storage.dropbox,
    jira: storage.jira,
    trello: storage.trello,
  };
};
