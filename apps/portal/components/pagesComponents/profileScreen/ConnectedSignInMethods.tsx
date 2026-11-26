import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import AppButton from 'components/controls/AppButton';
import useEverIdConfig from 'hooks/useEverIdConfig';
import {
  confirmEverIdConnectAPI,
  getEverIdConnectDetailsAPI,
  getEverIdIdentitiesAPI,
  IEverIdIdentity,
  startEverIdConnectAPI,
  unlinkEverIdAPI,
} from 'app/services/api/everId';
import { everIdErrorCode, everIdErrorMessageKey } from 'app/services/everId';
import { errorMessage, successMessage } from 'app/services/helpers/toastMessages';
import { panelRoutes, preRoutes } from 'components/_routes';

const SETTINGS_PROFILE = preRoutes.settings + panelRoutes.profile;

// The 32px button of a settings row (AppButton's default is 38px).
const SMALL_BUTTON = 'tw-px-3 tw-py-[5px]';

/**
 * Settings → "Connected sign-in methods": lists the Ever IDs connected to the account, connects
 * another one (a fresh Ever ID sign-in, then a confirmation that shows both e-mail addresses), and
 * disconnects one. Hidden when the server does not offer Ever ID sign-in.
 */
const ConnectedSignInMethods: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { enabled } = useEverIdConfig();
  const [identities, setIdentities] = useState<IEverIdIdentity[]>([]);
  const [pending, setPending] = useState<{ key: string; accountEmail: string; everIdEmail: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const handledQuery = useRef(false);

  const showError = (error: unknown) => errorMessage(t(everIdErrorMessageKey(everIdErrorCode(error))));

  const clearQuery = () => router.replace(SETTINGS_PROFILE, undefined, { shallow: true });

  useEffect(() => {
    if (!enabled) return;
    getEverIdIdentitiesAPI()
      .then(({ identities }) => setIdentities(identities ?? []))
      .catch(() => setIdentities([]));
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !router.isReady || handledQuery.current) return;
    const { ever_id_connect, ever_id_error } = router.query;
    if (typeof ever_id_error === 'string') {
      handledQuery.current = true;
      errorMessage(t(everIdErrorMessageKey(ever_id_error)));
      clearQuery();
    } else if (typeof ever_id_connect === 'string') {
      handledQuery.current = true;
      getEverIdConnectDetailsAPI(ever_id_connect)
        .then((details) => setPending({ key: ever_id_connect, ...details }))
        .catch((error) => {
          showError(error);
          clearQuery();
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, router.isReady, router.query]);

  if (!enabled) return null;

  const connect = async () => {
    setBusy(true);
    try {
      const { authorizationUrl } = await startEverIdConnectAPI();
      window.location.assign(authorizationUrl);
    } catch (error) {
      showError(error);
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const { identities } = await confirmEverIdConnectAPI(pending.key);
      setIdentities(identities ?? []);
      successMessage(t('page.auth.everId.settings.connected'));
    } catch (error) {
      showError(error);
    } finally {
      setPending(null);
      setBusy(false);
      clearQuery();
    }
  };

  const cancel = () => {
    setPending(null);
    clearQuery();
  };

  const disconnect = async (identity: IEverIdIdentity) => {
    setBusy(true);
    try {
      const { identities } = await unlinkEverIdAPI(identity.issuer, identity.subject);
      setIdentities(identities ?? []);
      successMessage(t('page.auth.everId.settings.disconnected'));
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      data-testid="ever-id-settings"
      className="tw-grid tw-gap-4 tw-border-0 tw-border-t tw-border-solid tw-border-border tw-py-6 md:tw-grid-cols-[14rem_minmax(0,1fr)] md:tw-gap-8"
    >
      <div>
        <h2 className="tw-m-0 tw-text-sm tw-font-medium tw-text-foreground">{t('page.auth.everId.settings.title')}</h2>
        <p className="tw-m-0 tw-mt-1 tw-text-[13px] tw-leading-5 tw-text-muted-foreground">
          {t('page.auth.everId.settings.description')}
        </p>
      </div>

      <div className="tw-min-w-0">
        {pending && (
          <div
            data-testid="ever-id-connect-confirm"
            className="tw-mb-4 tw-rounded-lg tw-border tw-border-solid tw-border-border tw-bg-muted tw-p-4"
          >
            <p className="tw-m-0 tw-mb-2 tw-text-sm tw-font-medium tw-text-foreground">
              {t('page.auth.everId.settings.confirmTitle')}
            </p>
            <p className="tw-m-0 tw-text-sm tw-text-muted-foreground">
              {t('page.auth.everId.settings.accountEmail')}:{' '}
              <b className="tw-font-medium tw-text-foreground">{pending.accountEmail}</b>
            </p>
            <p className="tw-m-0 tw-mb-4 tw-text-sm tw-text-muted-foreground">
              {t('page.auth.everId.settings.everIdEmail')}:{' '}
              <b className="tw-font-medium tw-text-foreground">{pending.everIdEmail}</b>
            </p>
            <div className="tw-flex tw-gap-2">
              <AppButton outlined onClick={cancel} disabled={busy} twPadding={SMALL_BUTTON} twTextSize="tw-text-[13px]">
                {t('page.auth.everId.cancel')}
              </AppButton>
              <AppButton onClick={confirm} disabled={busy} twPadding={SMALL_BUTTON} twTextSize="tw-text-[13px]">
                {t('page.auth.everId.settings.confirm')}
              </AppButton>
            </div>
          </div>
        )}

        {identities.length === 0 ? (
          <p className="tw-m-0 tw-mb-4 tw-text-sm tw-text-muted-foreground">{t('page.auth.everId.settings.none')}</p>
        ) : (
          <ul className="tw-m-0 tw-mb-4 tw-list-none tw-p-0">
            {identities.map((identity) => (
              <li
                key={`${identity.issuer}|${identity.subject}`}
                className="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-border-0 tw-border-b tw-border-solid tw-border-border tw-py-3 first:tw-pt-0 last:tw-border-b-0"
              >
                <span className="tw-min-w-0 tw-truncate tw-text-sm tw-text-foreground">
                  {t('page.auth.everId.settings.connectedAs', { email: identity.email || identity.subject })}
                </span>
                <AppButton
                  outlined
                  onClick={() => disconnect(identity)}
                  disabled={busy}
                  twPadding={SMALL_BUTTON}
                  twTextSize="tw-text-[13px]"
                  className="tw-shrink-0"
                >
                  {t('page.auth.everId.settings.disconnect')}
                </AppButton>
              </li>
            ))}
          </ul>
        )}

        {!pending && (
          <AppButton outlined onClick={connect} disabled={busy} twPadding={SMALL_BUTTON} twTextSize="tw-text-[13px]">
            {t('page.auth.everId.settings.connect')}
          </AppButton>
        )}
      </div>
    </section>
  );
};

export default ConnectedSignInMethods;
