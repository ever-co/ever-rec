import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { errorHandler } from '../../../app/services/helpers/errors';
import { useTranslation } from 'react-i18next';
// import { GoogleLogin } from 'react-google-login';

/**
 * Google sign-in needs an OAuth client ID baked into the build (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`).
 * Without one Google renders a button that can only fail, so none is shown.
 */
export const isGoogleSignInConfigured = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

const GoogleBtn = ({ onSuccess }: { onSuccess: (params: any) => any }) => {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    // Prefetch the images page for faster performance
    router.prefetch('/media/images');
  }, []);

  const onError = () => {
    errorHandler({ message: t('toasts.couldNotLog') });
  };

  if (!isGoogleSignInConfigured()) return null;

  return (
    <div className="tw-w-full tw-flex tw-justify-center">
      <GoogleLogin onSuccess={onSuccess} onError={onError} />
    </div>
  );
};

export default GoogleBtn;
