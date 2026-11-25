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
    <section data-testid="ever-id-settings" className="tw-mt-8 tw-p-4 tw-border tw-border-app-grey tw-rounded-md">
      <h2 className="tw-text-lg tw-font-semibold">{t('page.auth.everId.settings.title')}</h2>
      <p className="tw-text-sm tw-mb-4">{t('page.auth.everId.settings.description')}</p>

      {pending && (
        <div data-testid="ever-id-connect-confirm" className="tw-mb-4 tw-p-3 tw-rounded-md tw-bg-gray-50">
          <p className="tw-font-medium tw-mb-2">{t('page.auth.everId.settings.confirmTitle')}</p>
          <p className="tw-text-sm">
            {t('page.auth.everId.settings.accountEmail')}: <b>{pending.accountEmail}</b>
          </p>
          <p className="tw-text-sm tw-mb-3">
            {t('page.auth.everId.settings.everIdEmail')}: <b>{pending.everIdEmail}</b>
          </p>
          <div className="tw-flex tw-gap-3">
            <AppButton outlined onClick={cancel} disabled={busy}>
              {t('page.auth.everId.cancel')}
            </AppButton>
            <AppButton onClick={confirm} disabled={busy}>
              {t('page.auth.everId.settings.confirm')}
            </AppButton>
          </div>
        </div>
      )}

      {identities.length === 0 ? (
        <p className="tw-text-sm tw-mb-4">{t('page.auth.everId.settings.none')}</p>
      ) : (
        <ul className="tw-mb-4">
          {identities.map((identity) => (
            <li
              key={`${identity.issuer}|${identity.subject}`}
              className="tw-flex tw-justify-between tw-items-center tw-py-2"
            >
              <span className="tw-text-sm">
                {t('page.auth.everId.settings.connectedAs', { email: identity.email || identity.subject })}
              </span>
              <AppButton outlined onClick={() => disconnect(identity)} disabled={busy}>
                {t('page.auth.everId.settings.disconnect')}
              </AppButton>
            </li>
          ))}
        </ul>
      )}

      {!pending && (
        <AppButton onClick={connect} disabled={busy}>
          {t('page.auth.everId.settings.connect')}
        </AppButton>
      )}
    </section>
  );
};

export default ConnectedSignInMethods;
