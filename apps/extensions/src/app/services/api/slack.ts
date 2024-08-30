import api from './api';

const API_PREFIX = 'api/v1/slack';

const slackChannelList = (): Promise<any> => {
  return api.get(`${API_PREFIX}/channel-list`);
};

const slackPostMessage = async (
  channelId: string,
  imageId: string,
  type?: string,
): Promise<any> => {
  return api.post(`${API_PREFIX}/post-message`, {
    channelId,
    id: imageId,
    type,
  });
};

const slackLoginUrl = (): Promise<any> => {
  return api.get(`${API_PREFIX}/login-url`);
};

const slackDisconnect = (): Promise<any> => {
  return api.post(`${API_PREFIX}/disconnect`);
};

export { slackChannelList, slackPostMessage, slackLoginUrl, slackDisconnect };
