import { FC, useCallback, useEffect, useState } from 'react';
import { Button, Modal } from 'antd';
import { useRouter } from 'next/router';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { acceptTermsAPI, getTermsStatusAPI } from 'app/services/api/auth';
import { signOut } from 'app/services/auth';
import { ITermsStatus } from 'app/interfaces/ITermsAcceptance';
import AuthAC from 'store/auth/actions/AuthAC';
import { panelRoutes, preRoutes } from 'components/_routes';

/**
 * Blocks the app for a signed-in user who has not accepted the current terms.
 *
 * That is an account whose sign-up record failed (the API keeps the account and
 * only logs the failure: production had no Firestore until 2026-11-26) or one
 * that has not accepted a material new version. The dialog cannot be dismissed:
 * a dismissible consent dialog produces no record. The alternative to agreeing
 * is signing out.
 *
 * If the status cannot be read (network, an expired session), nothing is shown:
 * the server stays the authority, and a failed check must not lock people out.
 */
const TermsGate: FC = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch();
  const userId: string | undefined = useSelector(
    (state: RootStateOrAny) => state.auth?.user?.id,
  );
  const [status, setStatus] = useState<ITermsStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locale = (i18n?.language || 'en').split('-')[0];

  useEffect(() => {
    let active = true;
    setStatus(null);
    if (!userId) return;
    getTermsStatusAPI(locale)
      .then((next) => active && setStatus(next))
      .catch(() => active && setStatus(null));
    return () => {
      active = false;
    };
  }, [userId, locale]);

  const blocking = status?.blocking ?? [];

  const accept = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await acceptTermsAPI(
        blocking.map((doc) => ({
          documentId: doc.documentId,
          version: doc.requiredVersion,
          sha256: doc.requiredSha256,
          locale,
        })),
      );
      setStatus(next);
    } catch {
      setError(t('page.termsReaccept.failed'));
    } finally {
      setBusy(false);
    }
  }, [blocking, locale, t]);

  const leave = useCallback(() => {
    signOut();
    dispatch(AuthAC.setUser({ user: null }));
    router.push(preRoutes.auth + panelRoutes.login);
  }, [dispatch, router]);

  if (!userId || blocking.length === 0) return null;

  return (
    <Modal
      open
      closable={false}
      maskClosable={false}
      keyboard={false}
      title={t('page.termsReaccept.title')}
      footer={[
        <Button key="signout" onClick={leave} disabled={busy}>
          {t('page.termsReaccept.signOut')}
        </Button>,
        <Button
          key="accept"
          type="primary"
          data-testid="terms-accept"
          onClick={accept}
          loading={busy}
        >
          {t('page.termsReaccept.accept')}
        </Button>,
      ]}
    >
      <p>{t('page.termsReaccept.description')}</p>
      <ul data-testid="terms-documents">
        {blocking.map((doc) => (
          <li key={doc.documentId}>
            {doc.url ? (
              <a href={doc.url} target="_blank" rel="noopener noreferrer">
                {doc.title || doc.documentId}
              </a>
            ) : (
              doc.title || doc.documentId
            )}{' '}
            <small>
              {doc.acceptedVersion
                ? t('page.termsReaccept.updated', {
                    version: doc.requiredVersion,
                    accepted: doc.acceptedVersion,
                  })
                : t('page.termsReaccept.new', { version: doc.requiredVersion })}
            </small>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="tw-text-red-600">
          {error}
        </p>
      )}
    </Modal>
  );
};

export default TermsGate;
