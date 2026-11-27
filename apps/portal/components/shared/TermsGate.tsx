import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { Button, Modal } from 'antd';
import { useRouter } from 'next/router';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { acceptTermsAPI, getTermsStatusAPI } from 'app/services/api/auth';
import { signOut } from 'app/services/auth';
import { ITermsStatus } from 'app/interfaces/ITermsAcceptance';
import AuthAC from 'store/auth/actions/AuthAC';
import { legalDocumentUrl } from 'app/services/helpers/legalDocumentUrl';
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
/** A body that is not a status (an error envelope, an old API) counts as "cannot read": nothing is shown. */
const asStatus = (value: unknown): ITermsStatus | null =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ITermsStatus).satisfied === 'boolean' &&
  Array.isArray((value as ITermsStatus).blocking) &&
  Array.isArray((value as ITermsStatus).notices)
    ? (value as ITermsStatus)
    : null;

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
  // Who and which locale a response belongs to: a reply that arrives after a sign-out, a different sign-in or a
  // language switch must not open or close the dialog for the new session.
  const sessionKey = `${userId ?? ''}|${locale}`;
  const currentKey = useRef(sessionKey);
  currentKey.current = sessionKey;
  const applyFor = useCallback(
    (key: string) => (next: unknown) => {
      if (currentKey.current === key) setStatus(asStatus(next));
    },
    [],
  );

  useEffect(() => {
    // A new session starts clean: an accept request of the previous one may still be pending.
    setStatus(null);
    setError(null);
    setBusy(false);
    if (!userId) return;
    getTermsStatusAPI(locale)
      .then(applyFor(sessionKey))
      .catch(() => applyFor(sessionKey)(null));
  }, [userId, locale, sessionKey, applyFor]);

  const blocking = status?.blocking ?? [];

  const accept = useCallback(async () => {
    const key = sessionKey;
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
      applyFor(key)(next);
    } catch {
      if (currentKey.current === key) setError(t('page.termsReaccept.failed'));
      // The texts may have changed while the dialog was open (the server then refuses the old version):
      // reload what is required now, so the next "I agree" sends the current documents.
      getTermsStatusAPI(locale)
        .then(applyFor(key))
        .catch(() => undefined);
    } finally {
      if (currentKey.current === key) setBusy(false);
    }
  }, [blocking, locale, sessionKey, applyFor, t]);

  // The only way out besides agreeing: the user is cleared and the redirect happens even if clearing the
  // session throws, so the dialog cannot stay over the login page.
  const leave = useCallback(() => {
    try {
      signOut(); // synchronous: removes the token cookies and the cached Drive user
    } catch {
      // still leave: the user is cleared below, and a request without tokens is refused anyway
    } finally {
      setStatus(null);
      dispatch(AuthAC.setUser({ user: null }));
      router.push(preRoutes.auth + panelRoutes.login);
    }
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
        // Never disabled: it is the only way out, and an accept request that never settles must not trap anyone.
        <Button key="signout" data-testid="terms-signout" onClick={leave}>
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
            <a
              href={legalDocumentUrl(doc, doc.documentId)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {doc.title || doc.documentId}
            </a>{' '}
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
