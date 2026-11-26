import { useCallback, useEffect, useState } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { getAudit, getWorkspaceAudit, IEverConnectAuditRow } from 'app/services/ever-connect';
import { CODE, formatTime, MUTED_TEXT, TABLE, TABLE_FRAME } from './shared';

/** *Audit*: every connect, link, consent, switch and policy change, newest first, a page at a time. */
const EverConnectAudit: React.FC<{ operator: boolean; workspaceId?: string }> = ({ operator, workspaceId }) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<IEverConnectAuditRow[] | null>(null);
  const [more, setMore] = useState(false);
  const [paging, setPaging] = useState(false);

  const page = useCallback(
    async (before?: string) => {
      const answer = operator
        ? await getAudit(before)
        : workspaceId
          ? await getWorkspaceAudit(workspaceId, before)
          : { rows: [] };
      return answer?.rows ?? [];
    },
    [operator, workspaceId],
  );

  useEffect(() => {
    let active = true;
    page()
      .then((next) => {
        if (!active) return;
        setRows(next);
        setMore(next.length >= 50);
      })
      .catch(() => active && setRows([]));
    return () => {
      active = false;
    };
  }, [page]);

  if (!rows) return <p className={MUTED_TEXT}>{t('page.everPlatform.loading')}</p>;

  return (
    <div data-testid="ever-connect-audit" className="tw-flex tw-flex-col tw-items-start tw-gap-4">
      {rows.length === 0 ? (
        <p className={MUTED_TEXT}>{t('page.everPlatform.connect.audit.empty')}</p>
      ) : (
        <div className={`tw-w-full ${TABLE_FRAME}`}>
          <table className={`${TABLE} tw-tabular-nums`}>
            <thead>
              <tr>
                <th>{t('page.everPlatform.connect.audit.at')}</th>
                <th>{t('page.everPlatform.connect.audit.action')}</th>
                <th>{t('page.everPlatform.connect.audit.actor')}</th>
                <th>{t('page.everPlatform.connect.audit.details')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id ?? `${row.at}-${index}`} data-testid="ever-connect-audit-row">
                  <td className="tw-whitespace-nowrap">{formatTime(row.at)}</td>
                  <td>{row.action}</td>
                  <td>
                    <code className={CODE}>{row.actor}</code>
                  </td>
                  <td className="tw-text-muted-foreground">
                    {Object.entries(row.details ?? {})
                      .map(([key, value]) => `${key}: ${String(value)}`)
                      .join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {more && (
        <Button
          data-testid="ever-connect-audit-more"
          disabled={paging}
          onClick={async () => {
            setPaging(true);
            try {
              const next = await page(rows[rows.length - 1]?.id);
              setRows((current) => [...(current ?? []), ...next]);
              setMore(next.length >= 50);
            } catch {
              // Try again with the same button.
            } finally {
              setPaging(false);
            }
          }}
        >
          {t('page.everPlatform.connect.audit.more')}
        </Button>
      )}
    </div>
  );
};

export default EverConnectAudit;
