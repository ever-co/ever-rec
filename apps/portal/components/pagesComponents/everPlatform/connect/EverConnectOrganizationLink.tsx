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
import {
  DETAIL_LIST,
  DetailRow,
  formatTime,
  LadderBanner,
  MUTED_TEXT,
  NOTICE,
  useErrorMessage,
} from './shared';

/**
 * *Organization link* (the admin of a workspace): link the workspace to its Ever organization with
 * a link code from app.ever.co, see the handle, plan and entitlement state, unlink.
 */
const EverConnectOrganizationLink: React.FC<{ workspaceId: string }> = ({
  workspaceId,
}) => {
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
      setNotice(
        answer?.warning === 'organization_already_linked'
          ? t('page.everPlatform.connect.link.sameOrg')
          : done,
      );
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  if (!view) {
    return failed ? (
      <p data-testid="ever-connect-load-failed" className={MUTED_TEXT}>
        {t('page.everPlatform.errors.generic')}{' '}
        <Button
          data-testid="ever-connect-retry"
          size="small"
          onClick={() => void refresh()}
        >
          {t('page.everPlatform.connect.retry')}
        </Button>
      </p>
    ) : (
      <p data-testid="ever-connect-link-loading" className={MUTED_TEXT}>
        {t('page.everPlatform.loading')}
      </p>
    );
  }

  const linked = view.link && view.link.state !== 'unlinked';

  return (
    <div
      data-testid="ever-connect-link"
      className="tw-flex tw-flex-col tw-gap-4"
    >
      {view.managedBy === 'cloud' && (
        <p data-testid="ever-connect-cloud" className={MUTED_TEXT}>
          {t('page.everPlatform.connect.operatedByCloud')}
        </p>
      )}
      {!view.connected && (
        <p data-testid="ever-connect-not-connected" className={MUTED_TEXT}>
          {t('page.everPlatform.connect.link.notConnected')}
        </p>
      )}
      {linked && view.link ? (
        <section
          data-testid="ever-connect-linked"
          className="tw-flex tw-flex-col tw-gap-3"
        >
          <p className="tw-m-0 tw-text-lg tw-leading-7 tw-text-foreground">
            <strong
              data-testid="ever-connect-handle"
              className="tw-font-semibold"
            >
              {view.link.handle ? `ever.co/${view.link.handle}` : '—'}
            </strong>
          </p>
          <dl className={DETAIL_LIST}>
            <DetailRow label={t('page.everPlatform.connect.link.state')}>
              {t(
                `page.everPlatform.connect.link.states.${view.link.state}`,
                view.link.state,
              )}
            </DetailRow>
            <DetailRow label={t('page.everPlatform.connect.link.plan')}>
              {view.link.plan ?? '—'}
            </DetailRow>
            <DetailRow label={t('page.everPlatform.connect.link.linkedAt')}>
              {formatTime(view.link.linkedAt)}
            </DetailRow>
          </dl>
          <LadderBanner ladder={view.ladder} />
          {view.ladder.state === 'paused' && (
            <p data-testid="ever-connect-reconnect" className={MUTED_TEXT}>
              {t('page.everPlatform.connect.ladder.reconnect')}
            </p>
          )}
          <div className="tw-mt-1 tw-flex tw-flex-wrap tw-gap-2">
            <Button
              data-testid="ever-connect-link-refresh"
              disabled={busy}
              onClick={() =>
                run(
                  () => refreshWorkspace(workspaceId),
                  t('page.everPlatform.connect.refreshed'),
                )
              }
            >
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
                  onOk: () =>
                    run(
                      () => unlinkWorkspace(workspaceId),
                      t('page.everPlatform.connect.link.unlinked'),
                    ),
                })
              }
            >
              {t('page.everPlatform.connect.link.unlink')}
            </Button>
          </div>
        </section>
      ) : (
        view.connected && (
          <section
            data-testid="ever-connect-link-form"
            className="tw-flex tw-flex-col tw-items-start tw-gap-3"
          >
            <p className={MUTED_TEXT}>
              {t('page.everPlatform.connect.link.description')}
            </p>
            <Input
              data-testid="ever-connect-link-code"
              className="tw-max-w-md"
              placeholder="EVL-XXXX-XXXX-XXXX"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
            />
            <Button
              data-testid="ever-connect-link-submit"
              type="primary"
              disabled={busy || !code.trim()}
              onClick={() =>
                run(
                  () => linkWorkspace(workspaceId, code.trim()),
                  t('page.everPlatform.connect.link.linked'),
                )
              }
            >
              {t('page.everPlatform.connect.link.link')}
            </Button>
          </section>
        )
      )}
      {notice && (
        <p data-testid="ever-connect-notice" className={NOTICE}>
          {notice}
        </p>
      )}
    </div>
  );
};

export default EverConnectOrganizationLink;
