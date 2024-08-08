import axios, { AxiosResponse } from 'axios';
import { sendRuntimeMessage } from '@/content/utilities/scripts/sendRuntimeMessage';
import { AppMessagesEnum } from '@/app/messagess';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import { errorMessage } from '@/app/services/helpers/toastMessages';

const api = axios.create({
  baseURL: process.env.API_BASE_URL,
});

//TODO: change for extraction firebase only to the API
api.interceptors.request.use(
  async (config: any) => {
    const tokens = await chrome.storage.local.get(['idToken', 'refreshToken']);

    if (tokens) {
      config.headers['idToken'] = tokens.idToken;
      config.headers['refreshToken'] = tokens.refreshToken;
    }
    return config;
  },
  (error: any) => {
    Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  async (error: { response: AxiosResponse }) => {
    const statusCode = error.response?.status;

    if (statusCode === 401) {
      const tab = await chrome.tabs.getCurrent();
      sendRuntimeMessage({
        action: AppMessagesEnum.createLoginTabSW,
        payload: { justInstalled: false, signedOut: true, tab },
      });
    }

    if (statusCode === 403) {
      errorMessage('Insufficient permissions!');
      setTimeout(() => window.location.assign(panelRoutes.images.path), 3000);
    }

    return Promise.reject(error);
  },
);

export default api;
