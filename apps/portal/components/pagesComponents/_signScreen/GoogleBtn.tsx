import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { errorHandler } from '../../../app/services/helpers/errors';
import { useTranslation } from 'react-i18next';
// import { GoogleLogin } from 'react-google-login';

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

  return (
    <div className="tw-w-full tw-flex tw-justify-center">
      <GoogleLogin onSuccess={onSuccess} onError={onError} />
    </div>
  );
};

export default GoogleBtn;
