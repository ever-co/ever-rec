import axios, { AxiosResponse } from 'axios';
import { signOut } from '../auth';
import { getCookies } from '../helpers/getCookies';
import { panelRoutes, preRoutes } from 'components/_routes';
import { errorMessage } from 'app/services/helpers/toastMessages';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

api.interceptors.request.use(
  async (config: any) => {
    const { refreshToken, idToken } = getCookies();

    if (idToken) {
      config.headers['idToken'] = idToken;
      config.headers['refreshToken'] = refreshToken;
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
      await signOut();
      window.location.assign(
        `${process.env.NEXT_PUBLIC_WEBSITE_URL}/auth/login`,
      );
    }

    if (statusCode === 403) {
      errorMessage('Insufficient permissions!');
    }

    return Promise.reject(error);
  },
);

export default api;
