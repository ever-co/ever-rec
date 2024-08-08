import browser from '@/app/utilities/browser';
import { ResStatusEnum } from '../interfaces/IDataResponse';
import { IAtlassianSaveItem } from '../interfaces/IIntegrationTypes';
import { IUser } from '../interfaces/IUserData';
import AuthAC from '../store/auth/actions/AuthAC';
import store from '../store/panel';
import PanelAC from '../store/panel/actions/PanelAC';
import {
  createJiraIssueWithAttachment,
  createTrelloIssueWithAttachment,
  dropboxDisconnect,
  dropBoxLoginUrl,
  dropboxUploadFile,
  getJiraProjectsData,
  getTrelloProjectsData,
  jiraDisconnect,
  saveSegmentEventData,
  trelloDisconnect,
  trelloSaveOauthToken,
} from './api/messages';
import { errorHandler } from './helpers/errors';

const saveSegmentEvent = async (
  event: string,
  properties?: any,
): Promise<any> => {
  try {
    const res = await saveSegmentEventData(event, properties);
    return res;
  } catch (error: any) {
    console.log(error);
    errorHandler(error);
  }
};

const getDropBoxLoginUrl = async (): Promise<any> => {
  try {
    return await dropBoxLoginUrl();
  } catch (error: any) {
    errorHandler(error);
  }
};

const disconnectDropboxUser = async (user: IUser): Promise<any> => {
  try {
    const res = await dropboxDisconnect();

    if (res && res.status && res.status == ResStatusEnum.success) {
      store.dispatch(
        AuthAC.removeDropboxUser({
          user: {
            ...user,
            dropbox: { isDropBoxIntegrated: false, email: null },
          },
        }),
      );

      browser.storage.local.remove('dropbox');
    }

    return res;
  } catch (error: any) {
    errorHandler(error);
  }
};

const disconnectJiraUser = async (user: IUser): Promise<any> => {
  try {
    const res = await jiraDisconnect();
    if (res && res.status && res.status == ResStatusEnum.success) {
      store.dispatch(
        AuthAC.removeJiraUser({
          user: { ...user, jira: { isIntegrated: false, email: null } },
        }),
      );

      browser.storage.local.remove('jira');
    }
    return res;
  } catch (error: any) {
    errorHandler(error);
  }
};

const disconnectTrelloUser = async (user: IUser): Promise<any> => {
  try {
    const res = await trelloDisconnect();
    if (res && res.status && res.status == ResStatusEnum.success) {
      store.dispatch(
        AuthAC.removeTrelloUser({
          user: { ...user, trello: { isIntegrated: false, email: null } },
        }),
      );

      browser.storage.local.remove('trello');
    }
    return res;
  } catch (error: any) {
    errorHandler(error);
  }
};

const dropboxFileUpload = async (
  name: string,
  blob: Blob,
  itemId: any,
  itemType: string,
): Promise<any> => {
  try {
    const res = await dropboxUploadFile(name, blob, itemId, itemType);
    return res;
  } catch (error: any) {
    errorHandler(error);
  }
};

const jiraProjectsData = async (): Promise<any> => {
  const resData: any[] = [];
  try {
    const res = await getJiraProjectsData();
    if (res && res.status == ResStatusEnum.success && res.data) {
      store.dispatch(PanelAC.setJiraProjectData({ data: res.data }));
    }
  } catch (error: any) {
    errorHandler(error);
  }
  return resData;
};

const trelloProjectsData = async (): Promise<any[]> => {
  try {
    const res = await getTrelloProjectsData();

    if (res && res.status == ResStatusEnum.success && res.data) {
      store.dispatch(PanelAC.setTrelloData({ data: res.data }));
    }

    return res.data.boards;
  } catch (error: any) {
    errorHandler(error);
    return [];
  }
};

const jiraIssueWithAttachment = async (
  data: IAtlassianSaveItem,
): Promise<any> => {
  try {
    const res = await createJiraIssueWithAttachment(data);
    return res;
  } catch (error: any) {
    errorHandler(error);
  }
};

const trelloIssueWithAttachment = async (
  data: IAtlassianSaveItem,
): Promise<any> => {
  try {
    const res = await createTrelloIssueWithAttachment(data);
    return res;
  } catch (error: any) {
    errorHandler(error);
  }
};

const trelloSaveToken = async (token: string): Promise<any> => {
  try {
    const tokenData = token.split('=').pop() || '';
    const res = await trelloSaveOauthToken(tokenData);
    if (res && res.status == ResStatusEnum.success && res.data) {
      store.dispatch(
        AuthAC.setTrelloUser({
          payload: { isIntegrated: true, email: res.data.email },
        }),
      );
    }
    return res;
  } catch (error: any) {
    errorHandler(error);
  }
};

export {
  saveSegmentEvent,
  getDropBoxLoginUrl,
  disconnectDropboxUser,
  dropboxFileUpload,
  jiraProjectsData,
  jiraIssueWithAttachment,
  disconnectJiraUser,
  disconnectTrelloUser,
  trelloSaveToken,
  trelloProjectsData,
  trelloIssueWithAttachment,
};
