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
        errorHandler({ message: t('toasts.accountsNotSame') });
      }
    } catch (e) {
      console.log(e);
      errorHandler({
        message: t('toasts.couldNotProcess'),
      });
    }
  };

  useEffect(() => {
    if (router.isReady && router.query) {
      router.query.driveLogin ? setLoginType('drive') : setLoginType('google');
    }
  }, [router.isReady, router.query]);

  return (
    <div className="tw-flex tw-min-h-screen tw-w-full tw-items-center tw-justify-center tw-bg-background tw-p-4">
      <div className="tw-flex tw-w-full tw-max-w-[500px] tw-flex-col tw-items-center tw-gap-6 tw-rounded-xl tw-border tw-border-solid tw-border-border tw-bg-card tw-p-8">
        <h2 className="tw-m-0 tw-text-center tw-text-xl tw-font-semibold tw-text-foreground">
          {t('page.auth.common.googleRequire')}
        </h2>
        <div className="tw-flex tw-w-full tw-justify-center">
          {loginType === 'google' ? (
            <GoogleBtn onSuccess={googleLogin} />
          ) : (
            <div
              onClick={driveLogin}
              className="tw-max-w-full tw-cursor-pointer tw-overflow-hidden tw-rounded-md"
            >
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
