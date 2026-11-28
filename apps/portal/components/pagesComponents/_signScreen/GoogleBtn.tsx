import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { errorHandler } from '../../../app/services/helpers/errors';
import { useTranslation } from 'react-i18next';
import useResolvedTheme from 'components/theme/useResolvedTheme';
// import { GoogleLogin } from 'react-google-login';

/**
 * Google sign-in needs an OAuth client ID baked into the build (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`).
 * Without one Google renders a button that can only fail, so none is shown.
 */
export const isGoogleSignInConfigured = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

// Google draws its own button and only takes a width in pixels, between these two.
const GOOGLE_MIN_WIDTH = 200;
const GOOGLE_MAX_WIDTH = 400;

const GoogleBtn = ({ onSuccess }: { onSuccess: (params: any) => any }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useResolvedTheme();
  const holder = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(false);
  const [width, setWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    // Prefetch the images page for faster performance
    router.prefetch('/media/images');
  }, []);

  // The button is as wide as the place it is put in, like the buttons around it. Google draws it
  // once the width and the theme are known, so it is not drawn twice.
  useEffect(() => {
    const element = holder.current;
    if (!element) return;

    const measure = () => {
      const available = Math.floor(element.clientWidth);
      if (available > 0) {
        setWidth(
          Math.min(GOOGLE_MAX_WIDTH, Math.max(GOOGLE_MIN_WIDTH, available)),
        );
      }
      setMeasured(true);
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const onError = () => {
    errorHandler({ message: t('toasts.couldNotLog') });
  };

  if (!isGoogleSignInConfigured()) return null;

  return (
    // Google's frame is a light document: on a dark page it gets a white box around it unless the
    // frame's own colour scheme is light too.
    <div
      ref={holder}
      className="tw-flex tw-min-h-10 tw-w-full tw-justify-center [color-scheme:light]"
    >
      {measured && theme && (
        <GoogleLogin
          onSuccess={onSuccess}
          onError={onError}
          theme={theme === 'dark' ? 'filled_black' : 'outline'}
          size="large"
          shape="rectangular"
          width={width}
        />
      )}
    </div>
  );
};

export default GoogleBtn;
