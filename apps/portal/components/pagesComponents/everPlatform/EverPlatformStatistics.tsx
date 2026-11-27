import { useCallback, useEffect, useState } from 'react';
import { Button, Modal, Switch } from 'antd';
import { useTranslation } from 'react-i18next';
import { useDirection } from 'i18n/direction';
import {
  EVER_STATS_DOCS_URL,
  getHealth,
  getReports,
  getStatus,
  IEverStatsPreview,
  IEverStatsReport,
  IEverStatsStatus,
  preview as previewAPI,
  recount as recountAPI,
  resetIdentity as resetIdentityAPI,
  sendNow as sendNowAPI,
  setEnabled as setEnabledAPI,
} from 'app/services/ever-platform';
import {
  BLOCK_TITLE,
  MUTED_TEXT,
  NOTICE,
  PAYLOAD,
  SECTION_TITLE,
  StatTile,
} from './connect/shared';

type Load = 'loading' | 'ready' | 'unavailable';

const formatTime = (ms: number | null | undefined) =>
  ms ? new Date(ms).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '—';

/** The report bytes as sent, indented for reading (the stored bytes are shown unchanged below). */
const pretty = (text: string) => {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
};

/**
 * *Settings → Ever Platform → Statistics*: the operator sees the state of the anonymous usage
 * statistics, exactly what is sent and what was sent, and can switch them off, send now, recount
 * or reset the identity. Everyone else gets nothing (the API answers 404).
 */
const EverPlatformStatistics: React.FC = () => {
  const { t } = useTranslation();
  // antd's Modal.confirm renders outside ConfigProvider: it takes the direction itself.
  const direction = useDirection();
  const [load, setLoad] = useState<Load>('loading');
  const [status, setStatus] = useState<IEverStatsStatus | null>(null);
  const [whatIsSent, setWhatIsSent] = useState<IEverStatsPreview | null>(null);
  const [reports, setReports] = useState<IEverStatsReport[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      await getHealth();
      const [nextStatus, nextPreview, nextReports] = await Promise.all([
        getStatus(),
        previewAPI(),
        getReports(12),
      ]);
      setStatus(nextStatus);
      setWhatIsSent(nextPreview);
      setReports(nextReports?.reports ?? []);
      setLoad('ready');
    } catch {
      setLoad('unavailable');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await work();
      setNotice(done);
    } catch (error: any) {
      const code = error?.response?.data?.code;
      setNotice(
        code
          ? t(
              `page.everPlatform.errors.${code}`,
              t('page.everPlatform.errors.generic'),
            )
          : t('page.everPlatform.errors.generic'),
      );
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  if (load === 'loading') {
    return (
      <p data-testid="ever-platform-loading" className={MUTED_TEXT}>
        {t('page.everPlatform.loading')}
      </p>
    );
  }
  if (load === 'unavailable' || !status) {
    return (
      <p data-testid="ever-platform-unavailable" className={MUTED_TEXT}>
        {t('page.everPlatform.unavailable')}
      </p>
    );
  }

  const cloudManaged = status.reason === 'cloud-managed';
  const last = reports[0];

  return (
    <div
      data-testid="ever-platform-statistics"
      className="tw-flex tw-flex-col tw-gap-8"
    >
      <section className="tw-flex tw-flex-col tw-gap-1">
        <h3 className={SECTION_TITLE}>
          {t('page.everPlatform.statistics.title')}
        </h3>
        <p className={MUTED_TEXT}>
          {t('page.everPlatform.statistics.description')}
        </p>
        <p className="tw-m-0 tw-text-[13px] tw-leading-5">
          <a
            href={EVER_STATS_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('page.everPlatform.statistics.docs')}
          </a>
        </p>
      </section>

      <section
        data-testid="ever-platform-state"
        className="tw-flex tw-flex-col tw-gap-3"
      >
        <div className="tw-flex tw-items-center tw-gap-3">
          <Switch
            data-testid="ever-platform-toggle"
            checked={status.toggleEnabled}
            disabled={cloudManaged || busy}
            onChange={(checked) =>
              run(
                () => setEnabledAPI(checked),
                checked
                  ? t('page.everPlatform.statistics.turnedOn')
                  : t('page.everPlatform.statistics.turnedOff'),
              )
            }
          />
          <span className="tw-text-sm tw-font-medium tw-text-foreground">
            {t('page.everPlatform.statistics.toggle')}
          </span>
        </div>
        {cloudManaged && (
          <p data-testid="ever-platform-cloud-managed" className={MUTED_TEXT}>
            {t('page.everPlatform.statistics.cloudManaged')}
          </p>
        )}
        <p data-testid="ever-platform-reason" className={MUTED_TEXT}>
          {status.enabled
            ? t('page.everPlatform.statistics.stateOn')
            : t('page.everPlatform.statistics.stateOff')}{' '}
          ({t(`page.everPlatform.statistics.reason.${status.reason}`)})
        </p>
        <dl className="tw-m-0 tw-mt-1 tw-grid tw-grid-cols-1 tw-gap-3 sm:tw-grid-cols-2">
          <StatTile label={t('page.everPlatform.statistics.nextSend')}>
            {formatTime(status.nextSendAt)}
          </StatTile>
          <StatTile label={t('page.everPlatform.statistics.lastSent')}>
            {formatTime(status.lastSentAt)}
          </StatTile>
          <StatTile label={t('page.everPlatform.statistics.instanceId')}>
            <code>{status.instanceId}</code>
          </StatTile>
          <StatTile label={t('page.everPlatform.statistics.keyId')}>
            <code>{status.keyId}</code>
          </StatTile>
          <StatTile label={t('page.everPlatform.statistics.installSource')}>
            {status.installSource}
          </StatTile>
          <StatTile label={t('page.everPlatform.statistics.country')}>
            {status.country}
          </StatTile>
        </dl>
        {status.keyState !== 'ok' && (
          <p
            data-testid="ever-platform-key-state"
            className="tw-m-0 tw-text-[13px] tw-leading-5 tw-text-warning"
          >
            {t('page.everPlatform.statistics.keyUnreadable')}
          </p>
        )}
      </section>

      <section className="tw-flex tw-flex-wrap tw-gap-2">
        <Button
          data-testid="ever-platform-send"
          type="primary"
          disabled={!status.enabled || busy}
          onClick={() =>
            run(() => sendNowAPI(), t('page.everPlatform.statistics.sent'))
          }
        >
          {t('page.everPlatform.statistics.sendNow')}
        </Button>
        <Button
          data-testid="ever-platform-recount"
          disabled={busy}
          onClick={() =>
            run(
              () => recountAPI(),
              t('page.everPlatform.statistics.recountStarted'),
            )
          }
        >
          {t('page.everPlatform.statistics.recount')}
        </Button>
        <Button
          data-testid="ever-platform-reset"
          danger
          disabled={busy}
          onClick={() =>
            Modal.confirm({
              direction,
              title: t('page.everPlatform.statistics.resetTitle'),
              content: t('page.everPlatform.statistics.resetConfirm'),
              okText: t('page.everPlatform.statistics.reset'),
              okButtonProps: { danger: true },
              cancelText: t('common.cancel', 'Cancel'),
              onOk: () =>
                run(
                  () => resetIdentityAPI(),
                  t('page.everPlatform.statistics.resetDone'),
                ),
            })
          }
        >
          {t('page.everPlatform.statistics.reset')}
        </Button>
      </section>
      {notice && (
        <p data-testid="ever-platform-notice" className={NOTICE}>
          {notice}
        </p>
      )}

      <section className="tw-flex tw-flex-col tw-gap-2">
        <h4 className={BLOCK_TITLE}>
          {t('page.everPlatform.statistics.whatIsSent')}
        </h4>
        <pre data-testid="ever-platform-preview" className={PAYLOAD}>
          {whatIsSent ? JSON.stringify(whatIsSent.payload, null, 2) : '—'}
        </pre>
      </section>

      <section className="tw-flex tw-flex-col tw-gap-2">
        <h4 className={BLOCK_TITLE}>
          {t('page.everPlatform.statistics.lastPayload')}
        </h4>
        {last ? (
          <div
            data-testid="ever-platform-last"
            className="tw-flex tw-flex-col tw-gap-2"
          >
            <p className={`${MUTED_TEXT} tw-tabular-nums`}>
              {formatTime(last.sent_at ?? last.createdAt)} · {last.status}
              {last.httpStatus ? ` · HTTP ${last.httpStatus}` : ''}
              {last.hint === 'reset_identity'
                ? ` · ${t('page.everPlatform.statistics.resetHint')}`
                : ''}
            </p>
            <pre className={PAYLOAD}>{pretty(last.payload)}</pre>
          </div>
        ) : (
          <p className={MUTED_TEXT}>
            {t('page.everPlatform.statistics.noReport')}
          </p>
        )}
      </section>
    </div>
  );
};

export default EverPlatformStatistics;
