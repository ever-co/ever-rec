import { useGoogleLogin } from '@react-oauth/google';
import { completeOAuth } from 'app/services/api/auth';
import { setDriveUser } from '../app/services/google/user';
import { ResStatusEnum } from '../app/interfaces/IApiResponse';

const useGoogleDriveAuth = ({ pathname }: { pathname?: string }) => {
  const setupDriveUser = async (response: any) => {
    const res = await completeOAuth(response.code);

    if (res.status !== ResStatusEnum.error) {
      await setDriveUser(res.data);
    }
  };

  const handleError = (e: any) => {
    console.log(e);
  };

  const state = pathname
    ? {
        state: JSON.stringify({
          origin: pathname,
        }),
      }
    : {};

  const driveLogin = useGoogleLogin({
    onSuccess: setupDriveUser,
    onError: handleError,
    flow: 'auth-code',
    scope: 'https://www.googleapis.com/auth/drive',
    ux_mode: 'redirect',
    redirect_uri: `${process.env.NEXT_PUBLIC_WEBSITE_URL}/oauth`,
    ...state,
  });

  return { driveLogin };
};

export default useGoogleDriveAuth;
