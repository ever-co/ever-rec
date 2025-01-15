import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { preRoutes, panelRoutes } from 'components/_routes';

// Setup an interval to check if tokens are applied on the system and:
// - redirect user if they are not;
// - reload the page if the user logs in.
const useMonitorTokens = () => {
  const savedTokensRef = useRef<null | {
    idToken: string | undefined;
    refreshToken: string | undefined;
  }>(null);
  const router = useRouter();

  useEffect(() => {
    const checkCookie = function () {
      const cookies = document.cookie.split('; ');
      const idTokenArray = cookies.filter((cookie) =>
        cookie.includes('idToken'),
      );
      const idToken = idTokenArray.length
        ? idTokenArray[0].split('=')[1]
        : null;

      const refreshTokenArray = cookies.filter((cookie) =>
        cookie.includes('refreshToken'),
      );
      const refreshToken = refreshTokenArray.length
        ? refreshTokenArray[0].split('=')[1]
        : null;

      // If there no tokens, redirect to login
      if (!refreshToken && !idToken) {
        router.push(preRoutes.auth + panelRoutes.login);
        return;
      }

      if (!savedTokensRef.current) {
        savedTokensRef.current = {
          idToken: idToken || undefined,
          refreshToken: refreshToken || undefined,
        };
        return;
      }

      // User logged in - reload page
      if (
        refreshToken !== savedTokensRef.current.refreshToken &&
        idToken !== savedTokensRef.current.idToken
      ) {
        router.reload();
      }
    };

    const interval = setInterval(checkCookie, 1000);
    return () => clearInterval(interval);
  }, [router]);
};

export default useMonitorTokens;
