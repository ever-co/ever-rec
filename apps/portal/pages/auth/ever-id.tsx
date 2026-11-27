import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Checkbox from 'antd/lib/checkbox/Checkbox';
import AppButton from 'components/controls/AppButton';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import LogoWrapper from 'components/elements/LogoWrapper';
import everIdRedirect from 'misc/everIdRedirect';
import { everIdAuthorization, getRequiredTerms } from 'app/services/auth';
import { confirmEverIdSignUpAPI, getEverIdSignUpDetailsAPI } from 'app/services/api/everId';
import { everIdErrorCode, everIdErrorMessageKey, EverIdErrorMessageKey } from 'app/services/everId';
import { ITermsAcceptanceDocument } from 'app/interfaces/ITermsAcceptance';
import { readEverIdBinding } from 'app/services/everIdBinding';
import { panelRoutes, preRoutes } from 'components/_routes';
import { cn } from 'app/utilities/cn';

type Mode = 'working' | 'confirm' | 'error';

// A 40px-high button, the height of the fields beside it.
const BUTTON_40 = 'tw-flex tw-h-10 tw-items-center tw-justify-center';
const FIELD_LABEL =
  'tw-mb-1 tw-block tw-text-[13px] tw-font-medium tw-text-foreground';
// What Ever ID sent: shown as a field, on the quiet ground of a value that cannot be edited here.
const READ_ONLY_FIELD =
  'tw-h-10 tw-w-full tw-rounded-md tw-border tw-border-solid tw-border-input tw-bg-muted tw-px-3 tw-text-sm tw-text-foreground tw-outline-none';
const TERMS_LINK =
  'tw-text-brand-text tw-underline tw-underline-offset-4 hover:tw-text-brand-text';

/**
 * `/auth/ever-id`: where the API sends the browser back after an Ever ID sign-in.
 *
 * - `?code=` — a one-time code: exchanged for the session, which is stored like any other.
 * - `?confirm=` — a new person: "Create your Ever Rec account" with the name and e-mail from
 *   Ever ID (read-only) and the terms. Nothing exists until they confirm; leaving creates nothing.
 * - `?ever_id_error=` — the matching message.
 */
const EverIdPage: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const handled = useRef(false);
  const [mode, setMode] = useState<Mode>('working');
  const [errorKey, setErrorKey] = useState<EverIdErrorMessageKey>(everIdErrorMessageKey(undefined));
  const [details, setDetails] = useState<{ name: string | null; email: string } | null>(null);
  const [termsDocuments, setTermsDocuments] = useState<ITermsAcceptanceDocument[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const fail = (code: unknown) => {
    setErrorKey(everIdErrorMessageKey(code));
    setMode('error');
  };

  const finish = async (code: string, returnPath: unknown) => {
    try {
      const result = await everIdAuthorization(code);
      if (result.status === 'success') {
        everIdRedirect(router, returnPath);
        return;
      }
      fail('invalid_code');
    } catch (error) {
      fail(everIdErrorCode(error) ?? 'invalid_code');
    }
  };

  useEffect(() => {
    if (!router.isReady || handled.current) return;
    handled.current = true;
    const { code, confirm, ever_id_error } = router.query;

    if (typeof ever_id_error === 'string') {
      fail(ever_id_error);
    } else if (typeof code === 'string') {
      void finish(code, router.query.return);
    } else if (typeof confirm === 'string') {
      Promise.all([getEverIdSignUpDetailsAPI(confirm, readEverIdBinding()), getRequiredTerms()])
        .then(([signUp, documents]) => {
          setDetails(signUp);
          setTermsDocuments(documents);
          setMode('confirm');
        })
        .catch((error) => fail(everIdErrorCode(error) ?? 'pending_expired'));
    } else {
      fail(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  const create = async () => {
    const pending = router.query.confirm;
    if (typeof pending !== 'string' || !accepted) return;
    setBusy(true);
    try {
      const { code, return: returnPath } = await confirmEverIdSignUpAPI(
        pending,
        termsDocuments.map(({ documentId, version, sha256, locale }) => ({ documentId, version, sha256, locale })),
        readEverIdBinding(),
      );
      await finish(code, returnPath);
    } catch (error) {
      fail(everIdErrorCode(error) ?? 'pending_expired');
    } finally {
      setBusy(false);
    }
  };

  const backToLogin = () => router.push(preRoutes.auth + panelRoutes.login);

  return (
    <div className="tw-flex tw-min-h-screen tw-flex-col tw-items-center tw-bg-background tw-p-4 tw-pt-16">
      <LogoWrapper />
      <div className="tw-w-full tw-max-w-[24rem]">
        {mode === 'working' && <AppSpinner show />}

        {mode === 'error' && (
          <div data-testid="ever-id-page-error">
            <p
              role="alert"
              className="tw-mb-6 tw-rounded-md tw-border tw-border-solid tw-border-destructive/40 tw-bg-destructive-muted tw-px-3 tw-py-2 tw-text-sm tw-text-destructive-text"
            >
              {t(errorKey)}
            </p>
            <AppButton full twPadding="tw-px-4" className={BUTTON_40} onClick={backToLogin}>
              {t('page.auth.error.backToLogin')}
            </AppButton>
          </div>
        )}

        {mode === 'confirm' && details && (
          <div data-testid="ever-id-confirm">
            <h1 className="tw-mb-2 tw-text-2xl tw-font-semibold tw-text-foreground">{t('page.auth.everId.createAccountTitle')}</h1>
            <p className="tw-mb-6 tw-text-sm tw-text-muted-foreground">{t('page.auth.everId.createAccountIntro')}</p>

            <label htmlFor="ever-id-name" className={FIELD_LABEL}>
              {t('page.auth.everId.name')}
            </label>
            <input id="ever-id-name" readOnly value={details.name ?? ''} className={cn(READ_ONLY_FIELD, 'tw-mb-4')} />
            <label htmlFor="ever-id-email" className={FIELD_LABEL}>
              {t('page.auth.everId.email')}
            </label>
            <input id="ever-id-email" readOnly value={details.email} className={cn(READ_ONLY_FIELD, 'tw-mb-6')} />

            <div className="tw-flex tw-items-start tw-gap-2 tw-text-sm">
              {/* @ts-ignore */}
              <Checkbox
                aria-label={t('page.register.terms.agree')}
                checked={accepted}
                disabled={termsDocuments.length === 0}
                onChange={() => setAccepted((value) => !value)}
              />
              <p className="tw-m-0">
                {t('page.register.terms.agree')}
                <a className={TERMS_LINK} href="https://rec.com/tos" target="_blank" rel="noreferrer">
                  {t('page.register.terms.terms')}
                </a>
                {t('page.register.terms.and')}
                <a className={TERMS_LINK} href="https://rec.com/privacy" target="_blank" rel="noreferrer">
                  {t('page.register.terms.privacy')}
                </a>
              </p>
            </div>

            <div className="tw-mt-6 tw-flex tw-gap-3">
              <AppButton full twPadding="tw-px-4" className={BUTTON_40} outlined onClick={backToLogin}>
                {t('page.auth.everId.cancel')}
              </AppButton>
              <AppButton full twPadding="tw-px-4" className={BUTTON_40} disabled={!accepted || busy} onClick={create}>
                {t('page.auth.everId.create')}
              </AppButton>
            </div>
            <AppSpinner show={busy} />
          </div>
        )}
      </div>
    </div>
  );
};

export default EverIdPage;
