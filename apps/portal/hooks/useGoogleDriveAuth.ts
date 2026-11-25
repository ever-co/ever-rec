import { useEffect, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { completeOAuth, getDriveOAuthState } from 'app/services/api/auth';
import { setDriveUser } from '../app/services/google/user';
import { ResStatusEnum } from '../app/interfaces/IApiResponse';

const useGoogleDriveAuth = ({ pathname }: { pathname?: string }) => {
  // A connection starts with a one-time nonce from the API, which also sets a cookie on this
  // browser. Google sends it back in `state`, and the /oauth page returns it with the code, so the
  // API only accepts a code from a connection this user started in this browser.
  const [connection, setConnection] = useState<{
    nonce: string;
    state: string;
  } | null>(null);

  const setupDriveUser = async (response: any) => {
    const res = await completeOAuth(response.code, connection?.nonce);

    if (res.status !== ResStatusEnum.error) {
      await setDriveUser(res.data);
    }
  };

  const handleError = (e: any) => {
    console.log(e);
  };

  const requestCode = useGoogleLogin({
    onSuccess: setupDriveUser,
    onError: handleError,
    flow: 'auth-code',
    scope: 'https://www.googleapis.com/auth/drive',
    ux_mode: 'redirect',
    redirect_uri: `${process.env.NEXT_PUBLIC_WEBSITE_URL}/oauth`,
    state: connection?.state,
  });

  // useGoogleLogin makes a new client when `state` changes, in its own effect, which runs before
  // this one: the code is requested with the new state.
  useEffect(() => {
    if (connection) {
      requestCode();
    }
  }, [connection, requestCode]);

  const driveLogin = async () => {
    try {
      const nonce = await getDriveOAuthState();
      setConnection({
        nonce,
        state: JSON.stringify({ origin: pathname, nonce }),
      });
    } catch (e) {
      handleError(e);
    }
  };

  return { driveLogin };
};

export default useGoogleDriveAuth;
