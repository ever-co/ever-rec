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
import store from 'app/store/panel';
import AuthAC from 'app/store/auth/actions/AuthAC';
import PanelAC from 'app/store/panel/actions/PanelAC';
import { ResStatusEnum } from 'app/interfaces/IApiResponse';
import { IAtlassianSaveItem } from 'app/interfaces/IIntegrationTypes';

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

const disconnectDropboxUser = async (): Promise<any> => {
  try {
    const res = await dropboxDisconnect();
    if (res && res.status && res.status == 'success') {
      store.dispatch(AuthAC.removeDropboxUser());
    }
    return res;
  } catch (error: any) {
    errorHandler(error);
  }
};

const disconnectJiraUser = async (): Promise<any> => {
  try {
    const res = await jiraDisconnect();
    if (res && res.status && res.status == 'success') {
      store.dispatch(
        AuthAC.removeJiraUser({
          payload: { isIntegrated: false, email: null },
        }),
      );
    }
    return res;
  } catch (error: any) {
    errorHandler(error);
  }
};

const disconnectTrelloUser = async (): Promise<any> => {
  try {
    const res = await trelloDisconnect();
    if (res && res.status && res.status == 'success') {
      store.dispatch(
        AuthAC.removeTrelloUser({
          payload: { isIntegrated: false, email: null },
        }),
      );
    }
    return res;
  } catch (error: any) {
    errorHandler(error);
  }
};

const dropboxFileUpload = async (
  name: string,
  blob: Blob,
  itemId: string,
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
    token = token.split('=').pop();
    const res = await trelloSaveOauthToken(token);
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
