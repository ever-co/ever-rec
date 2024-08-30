import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { errorHandler } from '../../../app/services/helpers/errors';
// import { GoogleLogin } from 'react-google-login';

const GoogleBtn = ({ onSuccess }: { onSuccess: (params: any) => any }) => {
  const router = useRouter();

  useEffect(() => {
    // Prefetch the images page for faster performance
    router.prefetch('/media/images');
  }, []);

  const onError = () => {
    errorHandler({
      message: 'Error while trying to log with google, please try again later.',
    });
  };

  return (
    <div className="tw-w-full tw-flex tw-justify-center">
      <GoogleLogin onSuccess={onSuccess} onError={onError} />
    </div>
  );
};

export default GoogleBtn;
