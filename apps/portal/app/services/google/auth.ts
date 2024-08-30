import querystring from 'querystring';
import { getStorageItems, setStorageItems } from '../localStorage';
import api from '../api/api';

export interface DriveToken {
  access_token: string;
  expires_in: string;
  state: string;
  error: string;
}

export interface DriveUser {
  email: string;
  name?: string;
  picture?: string;
}

// export const googleAuthentication = async (): Promise<DriveToken> => {
//   return new Promise((resolve, reject) => {
//     // @ts-ignore
//     chrome.identity.launchWebAuthFlow(
//       {
//         url: createAuthEndpoint(),
//         interactive: true,
//       },
//       function (redirectUrl: string | undefined) {
//         // @ts-ignore
//         if (chrome.runtime.lastError) {
//           // @ts-ignore
//           reject(chrome.runtime.lastError);
//         } else {
//           if (redirectUrl) {
//             const rediresctArr: string[] = redirectUrl.split('#');
//             const { access_token, expires_in, state } = querystring.parse(
//               rediresctArr[1],
//             );
//             if (access_token && expires_in && state) {
//               const driveToken: DriveToken = {
//                 access_token: access_token.toString(),
//                 expires_in: expires_in.toString(),
//                 state: state.toString(),
//                 error: '',
//               };
//               setDriveToken(driveToken);
//               resolve(driveToken);
//             }
//           }
//         }
//       },
//     );
//   });
// };

// function createAuthEndpoint() {
//   const clientId = encodeURIComponent(process.env.GOOGLE_CLIENT_ID as string);
//   const responseType = encodeURIComponent('id_token token');
//   const redirectUri = encodeURIComponent(
//     process.env.EXTENTION_REDIRECT_URL as string,
//   );
//   const scope = 'openid email profile https://www.googleapis.com/auth/drive';
//   const state = 'jlfks3n';
//   const prompt = 'consent';
//   const nonce = encodeURIComponent(new Date().getTime().toString());
//   const openIdEndpointUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=${responseType}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}&prompt=${prompt}&nonce=${nonce}`;
//   return openIdEndpointUrl;
// }

// export function setDriveToken(
//   driveToken: DriveToken,
// ) {
//   localStorage.setItem('driveToken', JSON.stringify(driveToken));
//   return driveToken;
// }

export function getDriveToken() {
  const driveToken = localStorage.getItem('driveToken');
  return JSON.parse(driveToken) || null;
}

export const driveSignOut = () => {
  return api.delete(`/api/v1/drive/sign-out`);
};
