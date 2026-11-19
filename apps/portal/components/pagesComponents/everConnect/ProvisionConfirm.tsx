import { useEffect, useRef, useState } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { everIdStartUrl } from 'app/services/api/everId';
import { createEverIdBinding } from 'app/services/everIdBinding';
import { getCookies } from 'app/services/helpers/getCookies';
import {
  confirmProvision,
  IProvisionIntent,
  postProvisionIntent,
  rejectProvision,
} from 'app/services/ever-connect';

/** Where the intent waits while the person signs in with Ever ID (this tab only). */
export const PROVISION_INTENT_KEY = 'ever-connect.provision-intent';
export const PROVISION_PATH = '/ever-connect/provision';

type Phase = 'loading' | 'missing' | 'failed' | 'ready' | 'busy' | 'created' | 'declined';

/**
 * Reads the intent from the URL fragment (`#intent=…`), never from a query string, keeps it for
 * this tab only while the person signs in, and removes the fragment from the address bar.
 */
export function takeIntent(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  const fromHash = new URLSearchParams(hash).get('intent');
  if (fromHash) {
    window.sessionStorage.setItem(PROVISION_INTENT_KEY, fromHash);
    window.history.replaceState(null, '', window.location.pathname);
    return fromHash;
  }
  return window.sessionStorage.getItem(PROVISION_INTENT_KEY);
}

const codeOf = (error: any): string | null => {
  const code = error?.response?.data?.code;
  return typeof code === 'string' ? code : null;
};

/** Only an https address goes back to app.ever.co. */
const safeReturn = (url: string | null | undefined): string | null => {
  try {
    return url && new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
};

/**
 * The landing page of an Ever Rec workspace started from app.ever.co: "Create workspace X linked
 * to ever.co/handle in Ever Rec?" with *Create* and *Decline*. Nothing is created before *Create*,
 * and only for the person who started it (the same Ever ID).
 */
const ProvisionConfirm: React.FC = () => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('loading');
  const [intent, setIntent] = useState<IProvisionIntent | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const signedIn = !!getCookies()?.idToken;
  const started = useRef(false);

  useEffect(() => {
    // Once per page: the intent is read, posted and forgotten from the address bar.
    if (started.current) return;
    started.current = true;
    const raw = takeIntent();
    if (!raw) {
      setPhase('missing');
      return;
    }
    postProvisionIntent(raw)
      .then((answer) => {
        setIntent(answer);
        setPhase('ready');
      })
      .catch((error) => {
        window.sessionStorage.removeItem(PROVISION_INTENT_KEY);
        setMessage(t(`page.everConnect.provision.errors.${codeOf(error) ?? 'generic'}`, t('page.everConnect.provision.errors.generic')));
        setPhase('failed');
      });
  }, [t]);

  const finish = (returnTo: string | null, done: Phase) => {
    window.sessionStorage.removeItem(PROVISION_INTENT_KEY);
    setPhase(done);
    const target = safeReturn(returnTo);
    if (target) window.location.assign(target);
  };

  const create = async () => {
    if (!intent) return;
    setPhase('busy');
    setMessage(null);
    try {
      const answer = await confirmProvision(intent.provisionTxn);
      finish(answer.returnTo, 'created');
    } catch (error) {
      const code = codeOf(error);
      setMessage(
        code === 'intent_subject_mismatch'
          ? t('page.everConnect.provision.mismatch')
          : t(`page.everConnect.provision.errors.${code ?? 'generic'}`, t('page.everConnect.provision.errors.generic')),
      );
      setPhase('ready');
    }
  };

  const decline = async () => {
    if (!intent) return;
    setPhase('busy');
    try {
      const answer = await rejectProvision(intent.jti, intent.provisionTxn);
      finish(answer.returnTo, 'declined');
    } catch (error) {
      setMessage(t(`page.everConnect.provision.errors.${codeOf(error) ?? 'generic'}`, t('page.everConnect.provision.errors.generic')));
      setPhase('ready');
    }
  };

  return (
    <div data-testid="ever-connect-provision" className="tw-mx-auto tw-flex tw-max-w-xl tw-flex-col tw-gap-4 tw-p-8">
      <h1 className="tw-text-2xl tw-font-semibold">{t('page.everConnect.provision.title')}</h1>
      {phase === 'loading' && <p>{t('page.everConnect.provision.loading')}</p>}
      {phase === 'missing' && <p data-testid="ever-connect-provision-missing">{t('page.everConnect.provision.missing')}</p>}
      {phase === 'failed' && <p data-testid="ever-connect-provision-failed">{message}</p>}
      {(phase === 'ready' || phase === 'busy') && intent && (
        <section className="tw-flex tw-flex-col tw-gap-4">
          <p data-testid="ever-connect-provision-question">
            {t('page.everConnect.provision.question', { name: intent.displayName, handle: intent.handle })}
          </p>
          {signedIn ? (
            <div className="tw-flex tw-gap-3">
              <Button data-testid="ever-connect-provision-create" type="primary" disabled={phase === 'busy'} onClick={create}>
                {t('page.everConnect.provision.create')}
              </Button>
              <Button data-testid="ever-connect-provision-decline" disabled={phase === 'busy'} onClick={decline}>
                {t('page.everConnect.provision.decline')}
              </Button>
            </div>
          ) : (
            <div className="tw-flex tw-flex-col tw-gap-2">
              <p>{t('page.everConnect.provision.signInHint')}</p>
              <Button
                data-testid="ever-connect-provision-ever-id"
                type="primary"
                onClick={() => window.location.assign(everIdStartUrl(PROVISION_PATH, createEverIdBinding()))}
              >
                {t('page.everConnect.provision.continueWithEverId')}
              </Button>
              <Button data-testid="ever-connect-provision-decline" disabled={phase === 'busy'} onClick={decline}>
                {t('page.everConnect.provision.decline')}
              </Button>
            </div>
          )}
          {message && <p data-testid="ever-connect-provision-message">{message}</p>}
        </section>
      )}
      {phase === 'created' && <p data-testid="ever-connect-provision-created">{t('page.everConnect.provision.created')}</p>}
      {phase === 'declined' && <p data-testid="ever-connect-provision-declined">{t('page.everConnect.provision.declined')}</p>}
    </div>
  );
};

export default ProvisionConfirm;
