import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Switch, Tag } from 'antd';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import {
  acceptIntegration,
  disableIntegration,
  getConsentUrl,
  getIntegrations,
  getPolicy,
  getWorkspaceConsentUrl,
  getWorkspaceIntegrations,
  IEverConnectIntegration,
  IEverConnectPolicy,
  refreshIntegrations,
  refreshWorkspace,
  setPolicy,
} from 'app/services/ever-connect';

/** The states are read from Ever Platform at most this often when the tab is shown again. */
const FOCUS_REFRESH_MS = 30_000;
import { useErrorMessage } from './shared';

/** Where the consent screens live: the links the platform signs must point there. */
const CONSENT_ORIGINS = new Set(['https://app.ever.co', 'https://app-stage.ever.co', 'https://app-dev.ever.co']);

const consentLinkAllowed = (url: string) => {
  try {
    const parsed = new URL(url);
    return CONSENT_ORIGINS.has(parsed.origin) || parsed.hostname === 'localhost';
  } catch {
    return false;
  }
};

/**
 * *Integrations & data*: what each integration sends or receives (read-only scope table), its
 * state, *Enable…* (the consent screen of app.ever.co in a new tab; nothing is enabled here) and,
 * for the operator, *Disable*, accept or decline, and the instance policy.
 */
const EverConnectIntegrations: React.FC<{ operator: boolean; workspaceId?: string }> = ({ operator, workspaceId }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [rows, setRows] = useState<IEverConnectIntegration[] | null>(null);
  const [policy, setPolicyRows] = useState<IEverConnectPolicy[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const returned = useRef(false);
  const lastRemoteRefresh = useRef(0);

  const load = useCallback(async () => {
    try {
      setRows(operator ? await getIntegrations() : workspaceId ? await getWorkspaceIntegrations(workspaceId) : []);
      if (operator) setPolicyRows(await getPolicy());
    } catch {
      setRows([]);
    }
  }, [operator, workspaceId]);

  /** Reads the states from Ever Platform now (not only the copy this installation keeps). */
  const refreshFromPlatform = useCallback(async () => {
    lastRemoteRefresh.current = Date.now();
    try {
      if (operator) {
        setRows(await refreshIntegrations());
        return;
      }
      if (workspaceId) await refreshWorkspace(workspaceId);
    } catch {
      // The copy kept here is shown below.
    }
    await load();
  }, [operator, workspaceId, load]);

  useEffect(() => {
    // Back from the consent screen (`?ever_connect_return=1`): read the states once.
    if (router?.query?.ever_connect_return === '1' && !returned.current) {
      returned.current = true;
      void refreshFromPlatform();
    } else {
      void load();
    }
  }, [load, refreshFromPlatform, router?.query?.ever_connect_return]);

  useEffect(() => {
    // The consent happens in another tab: read the states from Ever Platform again when this one
    // is shown again (at most every 30 seconds).
    const onFocus = () => {
      if (Date.now() - lastRemoteRefresh.current < FOCUS_REFRESH_MS) return;
      void refreshFromPlatform();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshFromPlatform]);

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setNotice(null);
    try {
      await work();
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
      await load();
    }
  };

  const prepareConsent = async (key: string) => {
    setNotice(null);
    try {
      const answer = operator ? await getConsentUrl(key) : await getWorkspaceConsentUrl(workspaceId as string, key);
      if (answer.state === 'ready' && consentLinkAllowed(answer.url)) {
        setLinks((current) => ({ ...current, [key]: answer.url }));
      } else {
        setNotice(t(`page.everPlatform.connect.integrations.consentState.${answer.state}`, t('page.everPlatform.errors.generic')));
      }
    } catch (error) {
      setNotice(errorMessage(error));
    }
  };

  if (!rows) return <p data-testid="ever-connect-integrations-loading">{t('page.everPlatform.loading')}</p>;

  return (
    <div data-testid="ever-connect-integrations" className="tw-flex tw-flex-col tw-gap-4">
      <p>{t('page.everPlatform.connect.integrations.description')}</p>
      {rows.map((row) => {
        const rowPolicy = policy.find((item) => item.key === row.key);
        return (
          <section key={row.key} data-testid={`ever-connect-integration-${row.key}`} className="tw-rounded tw-border tw-p-4">
            <div className="tw-flex tw-items-center tw-gap-3">
              <h4 className="tw-font-semibold">{row.name}</h4>
              <Tag data-testid={`ever-connect-state-${row.key}`}>
                {t(`page.everPlatform.connect.integrations.states.${row.state}`, row.state)}
              </Tag>
            </div>
            <p>{row.description}</p>
            {row.pendingRemoteRevoke && <p>{t('page.everPlatform.connect.integrations.pendingRevoke')}</p>}
            <div className="tw-mt-2 tw-flex tw-flex-wrap tw-items-center tw-gap-3">
              <Button data-testid={`ever-connect-scope-${row.key}`} onClick={() => setOpen(open === row.key ? null : row.key)}>
                {t('page.everPlatform.connect.integrations.showScope')}
              </Button>
              {!row.enabled && row.connected && ['available', 'disabled', 'revoked', 'revoked_remote', 'declined'].includes(row.state) && (
                <Button data-testid={`ever-connect-enable-${row.key}`} disabled={busy} onClick={() => prepareConsent(row.key)}>
                  {t('page.everPlatform.connect.integrations.enable')}
                </Button>
              )}
              {links[row.key] && (
                <a data-testid={`ever-connect-consent-${row.key}`} href={links[row.key]} target="_blank" rel="noopener noreferrer">
                  {t('page.everPlatform.connect.integrations.openConsent')}
                </a>
              )}
              {operator && row.enabled && (
                <Button data-testid={`ever-connect-disable-${row.key}`} danger disabled={busy} onClick={() => run(() => disableIntegration(row.key))}>
                  {t('page.everPlatform.connect.integrations.disable')}
                </Button>
              )}
              {operator && row.state === 'pending_operator' && (
                <>
                  <Button data-testid={`ever-connect-accept-${row.key}`} type="primary" disabled={busy} onClick={() => run(() => acceptIntegration(row.key, true))}>
                    {t('page.everPlatform.connect.integrations.accept')}
                  </Button>
                  <Button data-testid={`ever-connect-decline-${row.key}`} disabled={busy} onClick={() => run(() => acceptIntegration(row.key, false))}>
                    {t('page.everPlatform.connect.integrations.decline')}
                  </Button>
                </>
              )}
              {operator && rowPolicy && (
                <span className="tw-flex tw-items-center tw-gap-2">
                  <Switch
                    data-testid={`ever-connect-policy-${row.key}`}
                    checked={rowPolicy.allowed}
                    disabled={busy || rowPolicy.deniedByEnv}
                    onChange={(checked) => run(() => setPolicy(row.key, checked))}
                  />
                  {rowPolicy.deniedByEnv
                    ? t('page.everPlatform.connect.integrations.deniedByEnv')
                    : t('page.everPlatform.connect.integrations.allowed')}
                </span>
              )}
            </div>
            {open === row.key && (
              <table data-testid={`ever-connect-scope-table-${row.key}`} className="tw-mt-3 tw-w-full tw-text-sm">
                <thead>
                  <tr>
                    <th>{t('page.everPlatform.connect.integrations.scope.field')}</th>
                    <th>{t('page.everPlatform.connect.integrations.scope.direction')}</th>
                    <th>{t('page.everPlatform.connect.integrations.scope.frequency')}</th>
                    <th>{t('page.everPlatform.connect.integrations.scope.purpose')}</th>
                    <th>{t('page.everPlatform.connect.integrations.scope.retention')}</th>
                  </tr>
                </thead>
                <tbody>
                  {row.scope.map((scope) => (
                    <tr key={scope.field_path}>
                      <td>
                        <code>{scope.field_path}</code>
                      </td>
                      <td>{t(`page.everPlatform.connect.integrations.directions.${scope.direction}`, scope.direction)}</td>
                      <td>{scope.frequency}</td>
                      <td>{scope.purpose}</td>
                      <td>{scope.retention}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
      <Button data-testid="ever-connect-integrations-refresh" disabled={busy} onClick={() => void refreshFromPlatform()}>
        {t('page.everPlatform.connect.refresh')}
      </Button>
      {notice && <p data-testid="ever-connect-notice">{notice}</p>}
    </div>
  );
};

export default EverConnectIntegrations;
