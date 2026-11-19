import { useCallback, useEffect, useState } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { getAudit, getWorkspaceAudit, IEverConnectAuditRow } from 'app/services/ever-connect';
import { formatTime } from './shared';

/** *Audit*: every connect, link, consent, switch and policy change, newest first, a page at a time. */
const EverConnectAudit: React.FC<{ operator: boolean; workspaceId?: string }> = ({ operator, workspaceId }) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<IEverConnectAuditRow[] | null>(null);
  const [more, setMore] = useState(false);

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

  if (!rows) return <p>{t('page.everPlatform.loading')}</p>;

  return (
    <div data-testid="ever-connect-audit">
      {rows.length === 0 ? (
        <p>{t('page.everPlatform.connect.audit.empty')}</p>
      ) : (
        <table className="tw-w-full tw-text-sm">
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
                <td>{formatTime(row.at)}</td>
                <td>{row.action}</td>
                <td>
                  <code>{row.actor}</code>
                </td>
                <td>
                  {Object.entries(row.details ?? {})
                    .map(([key, value]) => `${key}: ${String(value)}`)
                    .join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {more && (
        <Button
          data-testid="ever-connect-audit-more"
          onClick={async () => {
            const next = await page(rows[rows.length - 1]?.id);
            setRows([...rows, ...next]);
            setMore(next.length >= 50);
          }}
        >
          {t('page.everPlatform.connect.audit.more')}
        </Button>
      )}
    </div>
  );
};

export default EverConnectAudit;
