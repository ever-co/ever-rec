import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppContainer from 'components/containers/appContainer/AppContainer';
import LogoWrapper from 'components/elements/LogoWrapper';

function parseOAuthHash(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return Object.fromEntries(params.entries());
}

function validateDeeplink(rawUrl: string | null): string | null {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);

    // Allowed schemes — extend as needed
    const allowedProtocols = [
      process.env.NEXT_PUBLIC_DESKTOP_PROTOCOL, // e.g. "ever-rec:"
      'https:',
      'http:',
    ];

    if (!allowedProtocols.includes(url.protocol)) {
      return null; // reject dangerous schemes like javascript:, data:, etc.
    }

    return url.toString();
  } catch {
    return null; // invalid URL string
  }
}

export default function AuthorizePage() {
  const router = useRouter();
  const [deeplinkUrl, setDeeplinkUrl] = useState<string | null>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const oauthData = parseOAuthHash(window.location.hash);

    let candidateUrl: string | null = null;

    if (oauthData.access_token || oauthData.id_token) {
      candidateUrl = `${process.env.NEXT_PUBLIC_DESKTOP_PROTOCOL}//oauth?${new URLSearchParams(
        oauthData
      ).toString()}`;
    } else if (router.query.deep_link) {
      candidateUrl = String(router.query.deep_link);
    }

    const safeUrl = validateDeeplink(candidateUrl);
    if (safeUrl) {
      setDeeplinkUrl(safeUrl);

      // Try automatic redirect first
      const redirectTimeout = setTimeout(() => {
        window.location.href = safeUrl;
      }, 100); // slight delay to allow spinner render

      // Show manual button if redirect fails
      const showBtnTimeout = setTimeout(() => setShowButton(true), 1500);

      return () => {
        clearTimeout(redirectTimeout);
        clearTimeout(showBtnTimeout);
      };
    } else {
      router.replace('/');
    }
  }, [router]);

  return (
    <AppContainer>
      <div className="tw-flex tw-items-center tw-justify-center tw-h-screen tw-bg-gray-50">
        <div className="tw-bg-white tw-shadow tw-rounded-3xl tw-p-10 tw-flex tw-flex-col tw-items-center tw-space-y-6 tw-max-w-md tw-w-full tw-transition-all tw-duration-300">
          <LogoWrapper />
          <h1 className="tw-text-2xl tw-font-semibold tw-text-center tw-text-gray-800">
            Processing login...
          </h1>
          <p className="tw-text-gray-500 tw-text-center tw-text-sm">
            Redirecting to your app. If it doesn’t open automatically, click the
            button below.
          </p>

          {deeplinkUrl && showButton && (
            <a
              href={deeplinkUrl}
              rel="noopener noreferrer"
              aria-label="Open the native app"
              className="tw-bg-blue-600 hover:tw-bg-blue-700 tw-font-bold tw-px-8 tw-py-3 tw-rounded-xl tw-shadow-md tw-transition-colors tw-duration-200 tw-text-center tw-block"
            >
              Open App
            </a>
          )}
        </div>
      </div>
    </AppContainer>
  );
}
