// import { useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import AuthAC from 'store/auth/actions/AuthAC';
import { completeOAuth } from '../app/services/api/auth';
import { setDriveUser } from '../app/services/google/user';
import { sendExternalMessage } from '../misc/_helper';
import { ResStatusEnum } from '../app/interfaces/IApiResponse';

/** A tab, a line break or another control character, or a backslash. */
const isUnsafePathChar = (ch: string) => {
  const code = ch.charCodeAt(0);
  return ch === '\\' || code < 0x20 || code === 0x7f;
};

/**
 * A path on this site. `//host` and `/\host` are read by browsers as another site, and so is
 * `/<tab>/host`: URL parsing drops tabs and line breaks. So a backslash or a control character is
 * refused anywhere in the path.
 */
const isLocalPath = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.startsWith('/') &&
  !value.startsWith('//') &&
  !Array.from(value).some(isUnsafePathChar);

/**
 * The `state` Google sends back: `{ origin, nonce }` as JSON. Anything else gives no origin and no
 * nonce, and the API then refuses the code.
 */
const readState = (state: unknown): { origin?: string; nonce?: string } => {
  if (typeof state !== 'string' || !state) {
    return {};
  }
  try {
    const parsed = JSON.parse(state);
    return {
      origin: isLocalPath(parsed?.origin) ? parsed.origin : undefined,
      nonce: typeof parsed?.nonce === 'string' ? parsed.nonce : undefined,
    };
  } catch {
    return {};
  }
};

const Oauth = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  useEffect(() => {
    if (router.isReady && router.query.code) {
      const getOAuth2Creds = async () => {
        const { code, state } = router.query;
        const { origin, nonce } = readState(state);
        const response = await completeOAuth(String(code), nonce);
        if (response.status !== ResStatusEnum.error) {
          await setDriveUser(response.data);
          dispatch(
            AuthAC.setDriveUser({
              driveUser: response.data,
            }),
          );
          sendExternalMessage('setDriveUser', response.data);
          origin && router.push(origin);
        }
      };
      // A refused code is shown by the API client; nothing else is to be done here.
      getOAuth2Creds().catch((e) => console.log(e));
    } else {
      // window.close()
    }
  }, [router.query, router.isReady]);

  return null;
};

export default Oauth;
