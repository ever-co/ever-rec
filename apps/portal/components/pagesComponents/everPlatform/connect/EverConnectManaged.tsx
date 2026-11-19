import { useCallback, useEffect, useState } from 'react';
import { Button, Checkbox, Input, Switch } from 'antd';
import { useTranslation } from 'react-i18next';
import { getManaged, IManagedSettings, IManagedWindow, setManaged } from 'app/services/ever-connect';
import { formatTime, useErrorMessage } from './shared';

const DAYS = [0, 1, 2, 3, 4, 5, 6];

/**
 * *Maintenance operations* (the operator of a self-hosted installation only): whether an
 * organization owner may request a health report, a backup or a backup check from app.ever.co,
 * which kinds, in which weekly window (UTC), and the directory backups go to. Off by default; the
 * directory is never shown back.
 */
const EverConnectManaged: React.FC = () => {
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();
  const [settings, setSettings] = useState<IManagedSettings | null>(null);
  const [optIn, setOptIn] = useState(false);
  const [kinds, setKinds] = useState<string[]>([]);
  const [slot, setSlot] = useState<IManagedWindow>({ days: [0, 6], from: '02:00', to: '05:00' });
  const [backupDir, setBackupDir] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const apply = (next: IManagedSettings) => {
    setSettings(next);
    setOptIn(next.optIn);
    setKinds(next.kinds);
    if (next.windows[0]) setSlot(next.windows[0]);
  };

  const load = useCallback(async () => {
    try {
      apply(await getManaged());
    } catch (error) {
      setNotice(errorMessage(error));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    setNotice(null);
    try {
      apply(
        await setManaged({
          optIn,
          kinds,
          // The first window is edited here; any other window set before is kept.
          windows: [slot, ...settings.windows.slice(1)],
          ...(backupDir.trim() ? { backupDir: backupDir.trim() } : {}),
        }),
      );
      setBackupDir('');
      setNotice(t('page.everPlatform.connect.managed.saved'));
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (!settings) return <p>{notice ?? t('page.everPlatform.loading')}</p>;

  return (
    <div data-testid="ever-connect-managed" className="tw-flex tw-flex-col tw-gap-4">
      <p>{t('page.everPlatform.connect.managed.description')}</p>
      <label className="tw-flex tw-items-center tw-gap-3">
        <Switch data-testid="ever-connect-managed-opt-in" checked={optIn} onChange={setOptIn} />
        {t('page.everPlatform.connect.managed.optIn')}
      </label>
      <Checkbox.Group
        data-testid="ever-connect-managed-kinds"
        value={kinds}
        onChange={(values) => setKinds(values as string[])}
        options={settings.supportedKinds.map((kind) => ({
          value: kind,
          label: t(`page.everPlatform.connect.managed.kinds.${kind}`, kind),
        }))}
      />
      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
        <span>{t('page.everPlatform.connect.managed.window')}</span>
        <Checkbox.Group
          value={slot.days}
          onChange={(values) => setSlot({ ...slot, days: values as number[] })}
          options={DAYS.map((day) => ({ value: day, label: t(`page.everPlatform.connect.managed.days.${day}`) }))}
        />
        <Input className="tw-w-24" value={slot.from} onChange={(event) => setSlot({ ...slot, from: event.target.value })} />
        <Input className="tw-w-24" value={slot.to} onChange={(event) => setSlot({ ...slot, to: event.target.value })} />
        <span>UTC</span>
      </div>
      <label>
        {t('page.everPlatform.connect.managed.backupDir')}
        <Input
          data-testid="ever-connect-managed-backup-dir"
          value={backupDir}
          placeholder={settings.backupDirSet ? t('page.everPlatform.connect.managed.backupDirSet') : '/var/backups/ever-rec'}
          onChange={(event) => setBackupDir(event.target.value)}
        />
      </label>
      <p>{t('page.everPlatform.connect.managed.whatTheyGet')}</p>
      <Button data-testid="ever-connect-managed-save" type="primary" disabled={busy} onClick={save}>
        {t('page.everPlatform.connect.managed.save')}
      </Button>
      {notice && <p data-testid="ever-connect-notice">{notice}</p>}
      {settings.history.length > 0 && (
        <table data-testid="ever-connect-managed-history" className="tw-w-full tw-text-sm">
          <tbody>
            {settings.history.map((row) => (
              <tr key={row.operationId}>
                <td>{formatTime(row.at)}</td>
                <td>{t(`page.everPlatform.connect.managed.kinds.${row.kind}`, row.kind)}</td>
                <td>{row.status}</td>
                <td>{row.reason ?? (row.sizeBytes !== undefined ? `${row.sizeBytes} B` : '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default EverConnectManaged;
