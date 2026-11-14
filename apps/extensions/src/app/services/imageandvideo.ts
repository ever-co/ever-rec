import { sendItemToEmail } from '@/app/services/api/email';
import store from '@/app/store/panel';
import PanelAC from '../store/panel/actions/PanelAC';
import { errorHandler } from './helpers/errors';
import { updateMessage } from './helpers/toastMessages';
import { ItemType } from '@/app/interfaces/ItemTypes';
import { Id } from 'react-toastify';
import { IUser } from '@/app/interfaces/IUserData';
import { getItemUniqueViewsAPI } from './api/imageandvideo';
import { iDataResponseParser } from './helpers/iDataResponseParser';

export const sendItem = async (
  emails: string[],
  itemLink: string,
  itemType: ItemType,
  itemPublicLink: string,
  id: Id | undefined,
  templateUrl: string | false,
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

    // if (response.status == 'success') {
    //   updateMessage(id, response.message, 'success');
    // } else {
    //   updateMessage(id, response.message, 'error');
    // }
  } catch (e) {
    errorHandler(e);
  }
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
