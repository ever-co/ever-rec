import { sendItemToEmail } from 'app/services/api/email';
import store from 'app/store/panel';
import PanelAC from '../store/panel/actions/PanelAC';
import { errorHandler } from './helpers/errors';
import { updateMessage } from './helpers/toastMessages';
import { ItemType } from 'app/interfaces/ItemType';
import { IUser } from '../interfaces/IUserData';
import { Id } from 'react-toastify';
import { addUniqueViewAPI, getItemUniqueViewsAPI } from './api/imageandvideo';
import { iDataResponseParser } from './helpers/iDataResponseParser';

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
      templateUrl: templateUrl as any,
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
  sharedId: string,
  itemType: ItemType,
  isWorkspace: boolean,
) => {
  const res = await addUniqueViewAPI(sharedId, itemType, isWorkspace);
  const data = iDataResponseParser<typeof res.data>(res);
  return data;
};

// The viewers come back for the owner of the item only; the count is for everybody.
export const getItemUniqueViews = async (
  itemId: string,
  itemType: ItemType,
  workspaceId?: string,
) => {
  const res = await getItemUniqueViewsAPI(itemId, itemType, workspaceId);
  const data = iDataResponseParser(res);
  return data;
};
