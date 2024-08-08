import { IAtlassianSaveItem } from 'app/interfaces/IIntegrationTypes';
import api from './api';

const API_PREFIX = 'api/v1/messages';
const API_LOG_PREFIX = 'api/v1/log';
const API_ATLASSIAN_PREFIX = 'api/v1/atlassian';

const whatsAppMessage = async (
  id: string,
  phone: string,
  type?: string,
): Promise<void> => {
  return api.post(`${API_PREFIX}/send-whats-app-message`, {
    id,
    phone,
    type,
  });
};

const saveSegmentEventData = async (
  event: string,
  properties?: any,
): Promise<void> => {
  const context = window.location ? window.location : null;
  return api.post(`${API_LOG_PREFIX}/segment-event`, {
    event,
    properties,
    context,
  });
};

const dropBoxLoginUrl = (): Promise<any> => {
  return api.get(`api/v1/dropbox/sign-in`);
};

const dropboxDisconnect = (): Promise<any> => {
  return api.delete(`api/v1/dropbox/sign-out`);
};

async function dropboxUploadFile(
  name: string,
  blob: Blob,
  itemId: string,
  itemType: string,
): Promise<any> {
  const formData = new FormData();
  const metadata = {
    name,
    mimeType: blob.type,
  };

  formData.append('blob', blob);
  formData.append('metadata', JSON.stringify(metadata));

  return api.post(
    `/api/v1/dropbox/upload/file?itemId=${itemId}&itemType=${itemType}&name=${name}`,
    formData,
  );
}

async function deleteDropboxItem(
  itemId: string,
  itemType: string,
): Promise<any> {
  return api.delete(
    `/api/v1/dropbox/file?itemId=${itemId}&itemType=${itemType}`,
  );
}

const trelloSaveOauthToken = (token): Promise<any> => {
  return api.post(`${API_ATLASSIAN_PREFIX}/trello/complete-oauth`, { token });
};

const trelloDisconnect = (): Promise<any> => {
  return api.delete(`${API_ATLASSIAN_PREFIX}/trello/sign-out`);
};

const trelloOauthUrl = (): Promise<any> => {
  return api.get(`${API_ATLASSIAN_PREFIX}/trello/sign-in`);
};

const getTrelloProjectsData = (): Promise<any> => {
  return api.get(`${API_ATLASSIAN_PREFIX}/trello/project/data`);
};

const jiraOauthUrl = (): Promise<any> => {
  return api.get(`${API_ATLASSIAN_PREFIX}/jira/sign-in`);
};

const jiraDisconnect = (): Promise<any> => {
  return api.delete(`${API_ATLASSIAN_PREFIX}/jira/sign-out`);
};
const getJiraProjectsData = (): Promise<any> => {
  return api.get(`${API_ATLASSIAN_PREFIX}/jira/project/data`);
};

async function createJiraIssueWithAttachment(
  data: IAtlassianSaveItem,
): Promise<any> {
  return api.post(`${API_ATLASSIAN_PREFIX}/jira/create/issue`, { ...data });
}

async function createTrelloIssueWithAttachment(
  data: IAtlassianSaveItem,
): Promise<any> {
  return api.post(`${API_ATLASSIAN_PREFIX}/trello/create/issue`, { ...data });
}

export {
  whatsAppMessage,
  saveSegmentEventData,
  dropBoxLoginUrl,
  dropboxDisconnect,
  dropboxUploadFile,
  deleteDropboxItem,
  jiraOauthUrl,
  createJiraIssueWithAttachment,
  getJiraProjectsData,
  jiraDisconnect,
  trelloDisconnect,
  trelloOauthUrl,
  trelloSaveOauthToken,
  getTrelloProjectsData,
  createTrelloIssueWithAttachment,
};
