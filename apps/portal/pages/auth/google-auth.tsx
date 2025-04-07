import { CredentialResponse } from '@react-oauth/google';
import { signOut } from 'app/services/auth';
import { errorHandler } from 'app/services/helpers/errors';
import GoogleBtn from 'components/pagesComponents/_signScreen/GoogleBtn';
import jwtDecode from 'jwt-decode';
import cookie from 'js-cookie';
import { sendExternalMessage } from 'misc/_helper';
import useGoogleDriveAuth from '../../hooks/useGoogleDriveAuth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppSvg from '../../components/elements/AppSvg';
import { useTranslation } from 'react-i18next';

type loginTypes = 'google' | 'drive';

const GoogleAuth = () => {
  const { driveLogin } = useGoogleDriveAuth({ pathname: undefined });
  const router = useRouter();
  const { t } = useTranslation();
  const [loginType, setLoginType] = useState<loginTypes>('google');

  const googleLogin = (credentials: CredentialResponse) => {
    try {
      const cookieToken = cookie.get('idToken');
      const decodedToken: any = jwtDecode(credentials.credential || '');
      const decodedCookie: any = jwtDecode(cookieToken);

      if (decodedToken.email === decodedCookie.email) {
        signOut(true);
        sendExternalMessage('reAuth', { success: true });
      } else {
        errorHandler({ message: 'Accounts are not the same.' });
      }
    } catch (e) {
      console.log(e);
      errorHandler({
        message: 'Error while trying to process data, please try again later.',
      });
    }
  };

  useEffect(() => {
    if (router.isReady && router.query) {
      router.query.driveLogin ? setLoginType('drive') : setLoginType('google');
    }
  }, [router.isReady, router.query]);

  return (
    <div className="tw-flex tw-items-center tw-justify-center tw-bg-dark-grey tw-w-full tw-h-100vh">
      <div className="tw-border-solid tw-border-black tw-border tw-bg-white tw-w-500px tw-h-350px tw-p-10px tw-flex tw-flex-col tw-justify-around tw-items-center">
        <h2 className="tw-text-2xl  tw-text-center">
          {t('page.auth.common.googleRequire')}
        </h2>
        <div className="tw-flex tw-justify-center tw-w-full">
          {loginType === 'google' ? (
            <GoogleBtn onSuccess={googleLogin} />
          ) : (
            <div onClick={driveLogin} className="tw-cursor-pointer">
              <AppSvg
                path="/sign/sign-in-google.svg"
                width="400px"
                height="60px"
              ></AppSvg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleAuth;
