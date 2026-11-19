import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  getWorkspaceLink,
  IEverConnectLinkView,
  linkWorkspace,
  refreshWorkspace,
  unlinkWorkspace,
} from 'app/services/ever-connect';
import { formatTime, LadderBanner, useErrorMessage } from './shared';

/**
 * *Organization link* (the admin of a workspace): link the workspace to its Ever organization with
 * a link code from app.ever.co, see the handle, plan and entitlement state, unlink.
 */
const EverConnectOrganizationLink: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const [view, setView] = useState<IEverConnectLinkView | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setView(await getWorkspaceLink(workspaceId));
      setFailed(false);
    } catch {
      // The last view stays on screen; with none yet, a retry is offered.
      setFailed(true);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setNotice(null);
    try {
      const answer = (await work()) as IEverConnectLinkView | undefined;
      setNotice(answer?.warning === 'organization_already_linked' ? t('page.everPlatform.connect.link.sameOrg') : done);
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  if (!view) {
    return failed ? (
      <p data-testid="ever-connect-load-failed">
        {t('page.everPlatform.errors.generic')}{' '}
        <Button data-testid="ever-connect-retry" size="small" onClick={() => void refresh()}>
          {t('page.everPlatform.connect.retry')}
        </Button>
      </p>
    ) : (
      <p data-testid="ever-connect-link-loading">{t('page.everPlatform.loading')}</p>
    );
  }

  const linked = view.link && view.link.state !== 'unlinked';

  return (
    <div data-testid="ever-connect-link" className="tw-flex tw-flex-col tw-gap-4">
      {view.managedBy === 'cloud' && <p data-testid="ever-connect-cloud">{t('page.everPlatform.connect.operatedByCloud')}</p>}
      {!view.connected && <p data-testid="ever-connect-not-connected">{t('page.everPlatform.connect.link.notConnected')}</p>}
      {linked && view.link ? (
        <section data-testid="ever-connect-linked">
          <p className="tw-text-lg">
            <strong data-testid="ever-connect-handle">{view.link.handle ? `ever.co/${view.link.handle}` : '—'}</strong>
          </p>
          <dl className="tw-grid tw-grid-cols-2 tw-gap-x-4">
            <dt>{t('page.everPlatform.connect.link.state')}</dt>
            <dd>{t(`page.everPlatform.connect.link.states.${view.link.state}`, view.link.state)}</dd>
            <dt>{t('page.everPlatform.connect.link.plan')}</dt>
            <dd>{view.link.plan ?? '—'}</dd>
            <dt>{t('page.everPlatform.connect.link.linkedAt')}</dt>
            <dd>{formatTime(view.link.linkedAt)}</dd>
          </dl>
          <LadderBanner ladder={view.ladder} />
          {view.ladder.state === 'paused' && (
            <p data-testid="ever-connect-reconnect">{t('page.everPlatform.connect.ladder.reconnect')}</p>
          )}
          <div className="tw-mt-3 tw-flex tw-gap-3">
            <Button data-testid="ever-connect-link-refresh" disabled={busy} onClick={() => run(() => refreshWorkspace(workspaceId), t('page.everPlatform.connect.refreshed'))}>
              {t('page.everPlatform.connect.refresh')}
            </Button>
            <Button
              data-testid="ever-connect-unlink"
              danger
              disabled={busy}
              onClick={() =>
                Modal.confirm({
                  title: t('page.everPlatform.connect.link.unlinkTitle'),
                  content: t('page.everPlatform.connect.link.unlinkConfirm'),
                  okText: t('page.everPlatform.connect.link.unlink'),
                  okButtonProps: { danger: true },
                  cancelText: t('common.cancel', 'Cancel'),
                  onOk: () => run(() => unlinkWorkspace(workspaceId), t('page.everPlatform.connect.link.unlinked')),
                })
              }
            >
              {t('page.everPlatform.connect.link.unlink')}
            </Button>
          </div>
        </section>
      ) : (
        view.connected && (
          <section data-testid="ever-connect-link-form" className="tw-flex tw-flex-col tw-gap-3">
            <p>{t('page.everPlatform.connect.link.description')}</p>
            <Input
              data-testid="ever-connect-link-code"
              placeholder="EVL-XXXX-XXXX-XXXX"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
            />
            <Button
              data-testid="ever-connect-link-submit"
              type="primary"
              disabled={busy || !code.trim()}
              onClick={() => run(() => linkWorkspace(workspaceId, code.trim()), t('page.everPlatform.connect.link.linked'))}
            >
              {t('page.everPlatform.connect.link.link')}
            </Button>
          </section>
        )
      )}
      {notice && <p data-testid="ever-connect-notice">{notice}</p>}
    </div>
  );
};

export default EverConnectOrganizationLink;
