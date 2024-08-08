import cookie from 'js-cookie';
import { ITokens } from 'app/interfaces/IUserData';

export const getCookies = (): ITokens => {
  const idToken = cookie.get('idToken');
  const refreshToken = cookie.get('refreshToken');

  return { idToken, refreshToken };
};

export const removeCookies = () => {
  cookie.remove('idToken');
  cookie.remove('refreshToken');
};
