import { ITokens, IUser, IUserData } from 'app/interfaces/IUserData';
import jwt_decode from 'jwt-decode';
import cookie from 'js-cookie';
import { IDataResponse } from 'app/interfaces/IApiResponse';
import { isBrowserCompatible } from './browserCompatible';

export type externalMessageActionType =
  | 'signIn'
  | 'signOut'
  | 'openImageEdit'
  | 'updateUserData'
  | 'reAuth'
  | 'saveImage'
  | 'setDriveUser'
  | 'setActiveWorkspace';

const storeUserTokens = ({ idToken, refreshToken }: ITokens): void => {
  cookie.set('refreshToken', refreshToken);
  cookie.set('idToken', idToken);
};

// this must be outdated
const removeUserTokens = (): void => {
  localStorage.removeItem('idToken');
  localStorage.removeItem('refreshToken');
};

const getUserTokens = (): ITokens | null => {
  const idToken = localStorage.getItem('idToken');
  const refreshToken = localStorage.getItem('refreshToken');

  return idToken && refreshToken ? { idToken, refreshToken } : null;
};

const handleResponse = (response: IDataResponse) => {
  const { data, status } = response;
  if (status != 'error') {
    if ((data.refreshToken, data.idToken)) {
      cookie.set('refreshToken', data.refreshToken);
      cookie.set('idToken', data.idToken);
    }
  }
};

const parseUserData = (props: IUserData): IUser => {
  try {
    // TODO: can implement interface for the user data here
    const decodedToken: any = jwt_decode(props.idToken);

    return {
      id: decodedToken.user_id,
      email: props.email,
      provider: decodedToken.firebase?.sign_in_provider,
      photoURL: props.photoURL,
      displayName: props.displayName,
      isSlackIntegrate: props.isSlackIntegrate,
      dropbox: props.dropbox,
      jira: props.jira,
      trello: props.trello,
      favoriteFolders: props.favoriteFolders,
    };
  } catch (e) {
    console.log('Malformed token.', e);
  }
};

const sendExternalMessage = (
  action: externalMessageActionType,
  payload: any,
) => {
  if (!isBrowserCompatible) return;

  try {
    window['chrome'].runtime.sendMessage(process.env.NEXT_PUBLIC_EXTENSION_ID, {
      action,
      payload,
    });
  } catch (e) {
    console.log(e);
  }
};

export const parseCollectionToIdValueObj = (
  collection: Object | Array<any>,
) => {
  try {
    let result = collection;

    if (Array.isArray(collection)) {
      result = collection.filter((x) => x).every((x) => x.id)
        ? Object.fromEntries(collection.map((x) => [x.id, x]))
        : Object.fromEntries(
            collection.map((x, i) => (x.id ? [x.id, x] : [i, x])),
          );
    }

    return JSON.parse(JSON.stringify(result || {}));
  } catch (e) {
    console.log(e);
    return collection;
  }
};

export const parseCollectionToArray = (
  collection: Object | Array<any>,
  putKeyAsId?: boolean,
): any[] => {
  try {
    if (collection === null || collection === undefined) {
      return [];
    }

    if (Array.isArray(collection)) {
      return collection.filter((x) => x !== null || x !== undefined);
    }

    return Object.entries(collection).map(([key, value]) =>
      putKeyAsId ? { ...value, id: key } : value,
    );
  } catch (e) {
    console.log(e);
    return [];
  }
};

export {
  storeUserTokens,
  getUserTokens,
  parseUserData,
  removeUserTokens,
  sendExternalMessage,
  handleResponse,
};
