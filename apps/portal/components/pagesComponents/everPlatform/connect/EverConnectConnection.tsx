import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Modal, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  connectInstallation,
  disconnectInstallation,
  EVER_CONNECT_DOCS_URL,
  getConnectStatus,
  IEverConnectStatus,
  refreshEntitlements,
  rotateConnectKey,
  setPublicUrl,
} from 'app/services/ever-connect';
import { formatTime, LadderBanner, useErrorMessage } from './shared';

export interface AdminWorkspace {
  id: string;
  name: string;
}

/**
 * *Connection* (the operator of a self-hosted installation only): connect with a code from
 * app.ever.co, see the state, rotate the connect key, set the public address, disconnect.
 */
const EverConnectConnection: React.FC<{ workspaces: AdminWorkspace[] }> = ({ workspaces }) => {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const [status, setStatus] = useState<IEverConnectStatus | null>(null);
  const [code, setCode] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(workspaces[0]?.id);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await getConnectStatus());
      setFailed(false);
    } catch {
      // The last state stays on screen; with none yet, a retry is offered.
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!workspaceId && workspaces[0]) setWorkspaceId(workspaces[0].id);
  }, [workspaces, workspaceId]);

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await work();
      setNotice(done);
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  if (!status) {
    return failed ? (
      <p data-testid="ever-connect-load-failed">
        {t('page.everPlatform.errors.generic')}{' '}
        <Button data-testid="ever-connect-retry" size="small" onClick={() => void refresh()}>
          {t('page.everPlatform.connect.retry')}
        </Button>
      </p>
    ) : (
      <p data-testid="ever-connect-connection-loading">{t('page.everPlatform.loading')}</p>
    );
  }

  const connected = status.status === 'active' || status.status === 'pending_approval';

  return (
    <div data-testid="ever-connect-connection" className="tw-flex tw-flex-col tw-gap-6">
      <section>
        <h3 className="tw-text-lg tw-font-semibold">{t('page.everPlatform.connect.connection.title')}</h3>
        <p>{t('page.everPlatform.connect.connection.description')}</p>
        <p>
          <a href={EVER_CONNECT_DOCS_URL} target="_blank" rel="noopener noreferrer">
            {t('page.everPlatform.connect.docs')}
          </a>
        </p>
        {status.managedBy === 'cloud' && (
          <p data-testid="ever-connect-cloud">{t('page.everPlatform.connect.operatedByCloud')}</p>
        )}
      </section>

      {!connected && (
        <section data-testid="ever-connect-connect-form" className="tw-flex tw-flex-col tw-gap-3">
          <label>
            {t('page.everPlatform.connect.connection.code')}
            <Input
              data-testid="ever-connect-code"
              placeholder="EVC-XXXX-XXXX-XXXX"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
            />
          </label>
          <label>
            {t('page.everPlatform.connect.connection.workspace')}
            <Select
              data-testid="ever-connect-workspace"
              value={workspaceId}
              onChange={(value: string) => setWorkspaceId(value)}
              options={workspaces.map((workspace) => ({ value: workspace.id, label: workspace.name }))}
            />
          </label>
          <div data-testid="ever-connect-what-is-sent">
            <p>{t('page.everPlatform.connect.connection.whatIsSent')}</p>
            <ul className="tw-list-disc tw-pl-6">
              <li>{t('page.everPlatform.connect.connection.sentProduct', { version: status.version })}</li>
              <li>{t('page.everPlatform.connect.connection.sentInstallSource', { source: status.installSource })}</li>
              <li>{t('page.everPlatform.connect.connection.sentWorkspace')}</li>
              <li>{t('page.everPlatform.connect.connection.sentKey')}</li>
            </ul>
            <p>{t('page.everPlatform.connect.connection.notSent')}</p>
          </div>
          <Button
            data-testid="ever-connect-connect"
            type="primary"
            disabled={busy || !code.trim() || !workspaceId}
            onClick={() =>
              run(() => connectInstallation(code.trim(), workspaceId as string), t('page.everPlatform.connect.connection.connected'))
            }
          >
            {t('page.everPlatform.connect.connection.connect')}
          </Button>
        </section>
      )}

      <section data-testid="ever-connect-state">
        <dl className="tw-grid tw-grid-cols-2 tw-gap-x-4">
          <dt>{t('page.everPlatform.connect.connection.status')}</dt>
          <dd data-testid="ever-connect-status">{t(`page.everPlatform.connect.status.${status.status}`, status.status)}</dd>
          <dt>{t('page.everPlatform.connect.connection.platform')}</dt>
          <dd>{status.platform ?? '—'}</dd>
          <dt>{t('page.everPlatform.connect.connection.instanceId')}</dt>
          <dd>
            <code>{status.registryInstanceId ?? '—'}</code>
          </dd>
          <dt>{t('page.everPlatform.connect.connection.keyId')}</dt>
          <dd>
            <code>{status.connectKeyId ?? '—'}</code>
          </dd>
          <dt>{t('page.everPlatform.connect.connection.lastHeartbeat')}</dt>
          <dd>{formatTime(status.lastHeartbeatAt)}</dd>
          <dt>{t('page.everPlatform.connect.connection.linkedWorkspaces')}</dt>
          <dd>
            {status.links.length
              ? status.links.map((link) => `${link.handle ? `ever.co/${link.handle}` : link.workspaceId} (${link.state})`).join(', ')
              : '—'}
          </dd>
        </dl>
        {connected && <LadderBanner ladder={status.entitlement} />}
      </section>

      {connected && (
        <section className="tw-flex tw-flex-col tw-gap-3">
          <label>
            {t('page.everPlatform.connect.connection.publicUrl')}
            <Input
              data-testid="ever-connect-public-url"
              placeholder="https://rec.example.com"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>
          <p>{t('page.everPlatform.connect.connection.publicUrlHint')}</p>
          <div className="tw-flex tw-gap-3">
            <Button
              data-testid="ever-connect-save-url"
              disabled={busy || !url.trim()}
              onClick={() => run(() => setPublicUrl(url.trim()), t('page.everPlatform.connect.connection.publicUrlSaved'))}
            >
              {t('page.everPlatform.connect.connection.savePublicUrl')}
            </Button>
            <Button data-testid="ever-connect-refresh" disabled={busy} onClick={() => run(() => refreshEntitlements(), t('page.everPlatform.connect.refreshed'))}>
              {t('page.everPlatform.connect.refresh')}
            </Button>
            <Button
              data-testid="ever-connect-rotate"
              disabled={busy}
              onClick={() =>
                Modal.confirm({
                  title: t('page.everPlatform.connect.connection.rotateTitle'),
                  content: t('page.everPlatform.connect.connection.rotateConfirm'),
                  okText: t('page.everPlatform.connect.connection.rotate'),
                  cancelText: t('common.cancel', 'Cancel'),
                  onOk: () => run(() => rotateConnectKey(), t('page.everPlatform.connect.connection.rotated')),
                })
              }
            >
              {t('page.everPlatform.connect.connection.rotate')}
            </Button>
            <Button
              data-testid="ever-connect-disconnect"
              danger
              disabled={busy}
              onClick={() =>
                Modal.confirm({
                  title: t('page.everPlatform.connect.connection.disconnectTitle'),
                  content: t('page.everPlatform.connect.connection.disconnectConfirm'),
                  okText: t('page.everPlatform.connect.connection.disconnect'),
                  okButtonProps: { danger: true },
                  cancelText: t('common.cancel', 'Cancel'),
                  onOk: () => run(() => disconnectInstallation(), t('page.everPlatform.connect.connection.disconnected')),
                })
              }
            >
              {t('page.everPlatform.connect.connection.disconnect')}
            </Button>
          </div>
        </section>
      )}
      {notice && <p data-testid="ever-connect-notice">{notice}</p>}
    </div>
  );
};

export default EverConnectConnection;
