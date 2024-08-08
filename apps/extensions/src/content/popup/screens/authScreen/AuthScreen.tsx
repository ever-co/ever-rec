import { googleAuthorization } from '@/app/services/auth';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppStyleTitle, {
  AppStyleTitleProps,
} from '@/content/components/elements/AppStyleTitle';
import React, { useMemo, useState } from 'react';
import Login from './Login';
import Register from './Register';
import AppSvg from '@/content/components/elements/AppSvg';
import ResetEmail from './ResetEmail';

export enum AuthScreenType {
  login,
  register,
  reset,
}

const AuthScreen: React.FC = () => {
  const [currentSreenType, setCurrentScreenType] = useState(
    AuthScreenType.login,
  );

  const screenTitle: AppStyleTitleProps = useMemo(() => {
    return currentSreenType === AuthScreenType.login
      ? { title1: 'SIGN', title2: 'IN' }
      : currentSreenType === AuthScreenType.register
      ? { title1: 'SIGN', title2: 'UP' }
      : { title1: 'RESET', title2: 'EMAIL' };
  }, [currentSreenType]);

  const googleAuth = (): void => {
    googleAuthorization();
  };

  return (
    <div className="tw-p-4 tw-flex tw-flex-col tw-items-center">
      <h3 className="tw-font-semibold tw-text-lg">
        <AppStyleTitle {...screenTitle} spacing />
      </h3>
      <div>
        {currentSreenType === AuthScreenType.login ? (
          <Login changeAuthScreen={setCurrentScreenType} />
        ) : currentSreenType === AuthScreenType.register ? (
          <Register changeAuthScreen={setCurrentScreenType} />
        ) : (
          <ResetEmail changeAuthScreen={setCurrentScreenType} />
        )}
      </div>
      <div className="tw-flex tw-justify-end tw-mt-4">
        <AppButton
          onClick={googleAuth}
          bgColor="tw-bg-primary"
          outlined
          className="tw-mr-3"
        >
          <AppSvg path="images/panel/sign/google.svg" className="tw-mr-2" />
          Continue with Google
        </AppButton>
      </div>
    </div>
  );
};

export default AuthScreen;
