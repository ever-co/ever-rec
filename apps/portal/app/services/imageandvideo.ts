import { sendItemToEmail } from 'app/services/api/email';
import store from 'app/store/panel';
import PanelAC from '../store/panel/actions/PanelAC';
import { errorHandler } from './helpers/errors';
import { updateMessage } from './helpers/toastMessages';
import { ItemType } from 'app/interfaces/ItemType';
import { IUser } from '../interfaces/IUserData';
import { Id } from 'react-toastify';
import { DbVideoData } from 'app/interfaces/IEditorVideo';
import { DbImgData } from 'app/interfaces/IEditorImage';
import { addUniqueViewAPI, getItemUniqueViewsAPI } from './api/imageandvideo';
import { iDataResponseParser } from './helpers/iDataResponseParser';
import {
  IDbWorkspaceImageData,
  IDbWorkspaceVideoData,
} from 'app/interfaces/IWorkspace';

export const sendItem = async (
  emails: string[],
  itemLink: string,
  itemType: ItemType,
  itemPublicLink: string,
  id: Id,
  templateUrl?: string | false,
  message?: string | undefined,
) => {
  const user: IUser = store.getState().auth.user;

  try {
    const response = await sendItemToEmail({
      emails,
      itemLink,
      itemType,
      itemPublicLink,
      message,
      userDisplayName: user.displayName || user.email,
      templateUrl,
    });
    store.dispatch(
      PanelAC.setEmailImage({
        emailImage: false,
        emailImageLink: null,
        itemPublicLink: null,
      }),
    );

    // updateMessage(id, response.message, response.status);
  } catch (e) {
    errorHandler(e);
  }
};

export const addUniqueView = async (
  user: IUser | null,
  ip: string,
  videoData: IDbWorkspaceImageData | IDbWorkspaceVideoData,
  itemType: ItemType,
  isWorkspace: boolean,
) => {
  const res = await addUniqueViewAPI(
    user,
    ip,
    videoData,
    itemType,
    isWorkspace,
  );
  const data = iDataResponseParser<typeof res.data>(res);
  return data;
};

export const getItemUniqueViews = async (
  user: IUser,
  itemData: DbImgData | DbVideoData,
  itemType: ItemType,
  isWorkspace: boolean,
) => {
  const res = await getItemUniqueViewsAPI(
    user,
    itemData,
    itemType,
    isWorkspace,
  );
  const data = iDataResponseParser(res);
  return data;
};
