import AppContainer from 'components/containers/appContainer/AppContainer';
import LogoWrapper from 'components/elements/LogoWrapper';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

function parseOAuthHash(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return Object.fromEntries(params.entries());
}

function validateDeeplink(rawUrl: string | null): string | null {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);

    // Allowed schemes — extend as needed
    const allowedProtocols = new Set([process.env.NEXT_PUBLIC_DESKTOP_PROTOCOL, // e.g. "ever-rec:"
    ]);

    if (allowedProtocols.size === 0) {
      return null; // env not configured; fail safe
    }

    if (!allowedProtocols.has(url.protocol)) {
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
      <div className="tw-flex tw-min-h-screen tw-items-center tw-justify-center tw-bg-background tw-py-12">
        <div className="tw-flex tw-w-full tw-max-w-md tw-flex-col tw-items-center">
          <LogoWrapper />
          <h1 className="tw-m-0 tw-text-center tw-text-2xl tw-font-semibold tw-text-foreground" aria-live="polite">
            Processing login...
          </h1>
          <p className="tw-m-0 tw-mt-2 tw-text-center tw-text-sm tw-text-muted-foreground">
            Redirecting to Ever Rec Desktop. If it doesn’t open automatically, click the
            button below.
          </p>

          {deeplinkUrl && showButton && (
            <a
              href={deeplinkUrl}
              rel="noopener noreferrer"
              aria-label="Open the native app"
              className="tw-mt-6 tw-flex tw-h-10 tw-items-center tw-justify-center tw-rounded-md tw-bg-primary tw-px-6 tw-text-sm tw-font-medium tw-text-primary-foreground tw-transition-colors tw-duration-150 hover:tw-bg-primary/90 hover:tw-text-primary-foreground focus:tw-text-primary-foreground active:tw-text-primary-foreground"
            >
              Open Ever Rec Desktop
            </a>
          )}
        </div>
      </div>
    </AppContainer>
  );
}
