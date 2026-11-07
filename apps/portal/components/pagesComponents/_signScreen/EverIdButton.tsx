import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import useEverIdConfig from 'hooks/useEverIdConfig';
import { everIdStartUrl } from 'app/services/api/everId';
import { everIdErrorMessageKey, everIdReturnPath } from 'app/services/everId';

/**
 * "Continue with Ever ID", shown below the Google button only when the server offers Ever ID
 * sign-in. Also shows the message for an `ever_id_error` the sign-in came back with, and starts the
 * sign-in by itself when the page was opened with `?ever_id=1` (the browser extension does that).
 */
const EverIdButton: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { enabled } = useEverIdConfig();
  const autoStarted = useRef(false);

  const errorCode = router.isReady ? router.query.ever_id_error : undefined;

  const start = () => {
    const returnPath = everIdReturnPath(router.pathname, router.query);
    window.location.assign(everIdStartUrl(returnPath));
  };

  useEffect(() => {
    if (!enabled || !router.isReady || autoStarted.current) return;
    if (router.query.ever_id === '1' && !router.query.ever_id_error) {
      autoStarted.current = true;
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, router.isReady, router.query]);

  return (
    <>
      {errorCode && (
        <div
          role="alert"
          data-testid="ever-id-error"
          className="tw-w-full tw-mt-4 tw-p-3 tw-rounded-md tw-border tw-border-red-300 tw-bg-red-50 tw-text-sm tw-text-red-700"
        >
          {t(everIdErrorMessageKey(errorCode))}
        </div>
      )}
      {enabled && (
        <div className="tw-w-full tw-flex tw-justify-center tw-mt-4">
          <button
            type="button"
            data-testid="ever-id-button"
            onClick={start}
            className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-py-2 tw-px-4 tw-min-w-[200px] tw-border tw-border-app-grey tw-rounded tw-bg-white tw-text-sm tw-font-medium tw-text-dark-blue2 hover:tw-bg-gray-50"
          >
            {t('page.auth.everId.continue')}
          </button>
        </div>
      )}
    </>
  );
};

export default EverIdButton;
