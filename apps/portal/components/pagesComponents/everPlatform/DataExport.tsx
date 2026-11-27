import { useEffect, useState } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { getMyExport } from 'app/services/ever-connect';

type ExportState = 'loading' | 'ready' | 'unavailable';

/** The name of the downloaded file: the job id with letters, digits, `_` and `-` only. */
export const exportFileName = (jobId: string): string =>
  `ever-rec-export-${jobId.replace(/[^A-Za-z0-9_-]/g, '')}.json`;

/**
 * The export Ever Rec made of the signed-in account (`uid`) for an export request sent from
 * app.ever.co (`job`). The API answers it to that account only, for 7 days; anything else reads
 * as not available.
 */
const DataExport: React.FC<{ job: string; uid?: string }> = ({ job, uid }) => {
  const { t } = useTranslation();
  const [state, setState] = useState<ExportState>('loading');
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    if (!uid) return undefined;
    if (!job) {
      setState('unavailable');
      return undefined;
    }
    let active = true;
    setState('loading');
    getMyExport(job)
      .then((answer) => {
        if (!active) return;
        setData(answer);
        setState('ready');
      })
      .catch(() => {
        if (active) setState('unavailable');
      });
    return () => {
      active = false;
    };
  }, [job, uid]);

  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = exportFileName(job);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  };

  return (
    <div data-testid="data-export">
      <h1 className="tw-text-2xl tw-font-semibold">{t('page.dataExport.title')}</h1>
      <p className="tw-mt-2 tw-max-w-2xl">{t('page.dataExport.intro')}</p>
      {state === 'loading' && <p className="tw-mt-4">{t('page.everPlatform.loading')}</p>}
      {state === 'unavailable' && (
        <p className="tw-mt-4 tw-max-w-2xl" data-testid="data-export-unavailable">
          {t('page.dataExport.unavailable')}
        </p>
      )}
      {state === 'ready' && (
        <Button type="primary" className="tw-mt-4" onClick={download} data-testid="data-export-download">
          {t('page.dataExport.download')}
        </Button>
      )}
    </div>
  );
};

export default DataExport;
