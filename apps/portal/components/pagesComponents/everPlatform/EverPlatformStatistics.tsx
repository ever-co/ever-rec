import { useCallback, useEffect, useState } from 'react';
import { Button, Modal, Switch } from 'antd';
import { useTranslation } from 'react-i18next';
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

type Load = 'loading' | 'ready' | 'unavailable';

const formatTime = (ms: number | null | undefined) => (ms ? new Date(ms).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '—');

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
  const [load, setLoad] = useState<Load>('loading');
  const [status, setStatus] = useState<IEverStatsStatus | null>(null);
  const [whatIsSent, setWhatIsSent] = useState<IEverStatsPreview | null>(null);
  const [reports, setReports] = useState<IEverStatsReport[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      await getHealth();
      const [nextStatus, nextPreview, nextReports] = await Promise.all([getStatus(), previewAPI(), getReports(12)]);
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
      setNotice(code ? t(`page.everPlatform.errors.${code}`, t('page.everPlatform.errors.generic')) : t('page.everPlatform.errors.generic'));
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  if (load === 'loading') {
    return <p data-testid="ever-platform-loading">{t('page.everPlatform.loading')}</p>;
  }
  if (load === 'unavailable' || !status) {
    return <p data-testid="ever-platform-unavailable">{t('page.everPlatform.unavailable')}</p>;
  }

  const cloudManaged = status.reason === 'cloud-managed';
  const last = reports[0];

  return (
    <div data-testid="ever-platform-statistics" className="tw-flex tw-flex-col tw-gap-6">
      <section>
        <h3 className="tw-text-lg tw-font-semibold">{t('page.everPlatform.statistics.title')}</h3>
        <p>{t('page.everPlatform.statistics.description')}</p>
        <p>
          <a href={EVER_STATS_DOCS_URL} target="_blank" rel="noopener noreferrer">
            {t('page.everPlatform.statistics.docs')}
          </a>
        </p>
      </section>

      <section data-testid="ever-platform-state">
        <div className="tw-flex tw-items-center tw-gap-3">
          <Switch
            data-testid="ever-platform-toggle"
            checked={status.toggleEnabled}
            disabled={cloudManaged || busy}
            onChange={(checked) =>
              run(() => setEnabledAPI(checked), checked ? t('page.everPlatform.statistics.turnedOn') : t('page.everPlatform.statistics.turnedOff'))
            }
          />
          <span>{t('page.everPlatform.statistics.toggle')}</span>
        </div>
        {cloudManaged && <p data-testid="ever-platform-cloud-managed">{t('page.everPlatform.statistics.cloudManaged')}</p>}
        <p data-testid="ever-platform-reason">
          {status.enabled ? t('page.everPlatform.statistics.stateOn') : t('page.everPlatform.statistics.stateOff')}{' '}
          ({t(`page.everPlatform.statistics.reason.${status.reason}`)})
        </p>
        <dl className="tw-grid tw-grid-cols-2 tw-gap-x-4">
          <dt>{t('page.everPlatform.statistics.nextSend')}</dt>
          <dd>{formatTime(status.nextSendAt)}</dd>
          <dt>{t('page.everPlatform.statistics.lastSent')}</dt>
          <dd>{formatTime(status.lastSentAt)}</dd>
          <dt>{t('page.everPlatform.statistics.instanceId')}</dt>
          <dd>
            <code>{status.instanceId}</code>
          </dd>
          <dt>{t('page.everPlatform.statistics.keyId')}</dt>
          <dd>
            <code>{status.keyId}</code>
          </dd>
          <dt>{t('page.everPlatform.statistics.installSource')}</dt>
          <dd>{status.installSource}</dd>
          <dt>{t('page.everPlatform.statistics.country')}</dt>
          <dd>{status.country}</dd>
        </dl>
        {status.keyState !== 'ok' && <p data-testid="ever-platform-key-state">{t('page.everPlatform.statistics.keyUnreadable')}</p>}
      </section>

      <section className="tw-flex tw-gap-3">
        <Button
          data-testid="ever-platform-send"
          type="primary"
          disabled={!status.enabled || busy}
          onClick={() => run(() => sendNowAPI(), t('page.everPlatform.statistics.sent'))}
        >
          {t('page.everPlatform.statistics.sendNow')}
        </Button>
        <Button data-testid="ever-platform-recount" disabled={busy} onClick={() => run(() => recountAPI(), t('page.everPlatform.statistics.recountStarted'))}>
          {t('page.everPlatform.statistics.recount')}
        </Button>
        <Button
          data-testid="ever-platform-reset"
          danger
          disabled={busy}
          onClick={() =>
            Modal.confirm({
              title: t('page.everPlatform.statistics.resetTitle'),
              content: t('page.everPlatform.statistics.resetConfirm'),
              okText: t('page.everPlatform.statistics.reset'),
              okButtonProps: { danger: true },
              cancelText: t('common.cancel', 'Cancel'),
              onOk: () => run(() => resetIdentityAPI(), t('page.everPlatform.statistics.resetDone')),
            })
          }
        >
          {t('page.everPlatform.statistics.reset')}
        </Button>
      </section>
      {notice && <p data-testid="ever-platform-notice">{notice}</p>}

      <section>
        <h4 className="tw-font-semibold">{t('page.everPlatform.statistics.whatIsSent')}</h4>
        <pre data-testid="ever-platform-preview" className="tw-overflow-auto tw-text-xs">
          {whatIsSent ? JSON.stringify(whatIsSent.payload, null, 2) : '—'}
        </pre>
      </section>

      <section>
        <h4 className="tw-font-semibold">{t('page.everPlatform.statistics.lastPayload')}</h4>
        {last ? (
          <div data-testid="ever-platform-last">
            <p>
              {formatTime(last.sent_at ?? last.createdAt)} · {last.status}
              {last.httpStatus ? ` · HTTP ${last.httpStatus}` : ''}
              {last.hint === 'reset_identity' ? ` · ${t('page.everPlatform.statistics.resetHint')}` : ''}
            </p>
            <pre className="tw-overflow-auto tw-text-xs">{pretty(last.payload)}</pre>
          </div>
        ) : (
          <p>{t('page.everPlatform.statistics.noReport')}</p>
        )}
      </section>
    </div>
  );
};

export default EverPlatformStatistics;
