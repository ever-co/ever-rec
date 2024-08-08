import { getStorageItems, removeStorageItems } from '../services/localStorage';
import jwt_decode from 'jwt-decode';
import store from 'app/store/panel';
import AuthAC from '../store/auth/actions/AuthAC';
import { IUser } from '../interfaces/IUserData';

export const updateUserAuthAC = async (): Promise<void> => {
  try {
    const user = await getUserFromStore();
    if (user) {
      store.dispatch(AuthAC.setUser({ user }));
    } else {
      await removeStorageItems(['idToken', 'refreshToken']);
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
    'dropbox',
    'jira',
    'trello',
    'isDropBoxIntegrated',
  ]);
  if (!storage.idToken) return null;
  const decodedToken: any = jwt_decode(storage.idToken);

  const user: IUser = {
    id: decodedToken.user_id,
    email: storage.email,
    photoURL: storage.photoURL,
    displayName: storage.displayName,
    isSlackIntegrate: storage.isSlackIntegrate,
    dropbox: storage.dropbox,
    jira: storage.jira,
    trello: storage.trello,
    provider: decodedToken.firebase.sign_in_provider,
  };
  return user;
};
