import { useEffect, useState } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { getMyExport } from 'app/services/ever-connect';

type ExportState = 'loading' | 'ready' | 'unavailable';

/** What the export holds, in the order the page lists it (`page.dataExport.contents.*`). */
const CONTENTS = ['profile', 'identities', 'workspaces', 'media'] as const;

/**
 * The page's one action in Rec's violet, at the radius of Rec's own buttons. antd's primary
 * blue is not Rec's (its theme colour cannot be set without antd's .less styles), so the button
 * keeps antd's behaviour and takes Rec's colours, with a darker violet on hover and a visible
 * keyboard focus ring.
 */
const DOWNLOAD_BUTTON = [
  'tw-rounded-md',
  '!tw-bg-primary-purple !tw-border-primary-purple',
  'hover:!tw-bg-torea-bay hover:!tw-border-torea-bay',
  'focus-visible:!tw-outline focus-visible:!tw-outline-2 focus-visible:!tw-outline-offset-2 focus-visible:!tw-outline-primary-purple',
].join(' ');

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
    <section data-testid="data-export" className="tw-max-w-2xl tw-text-base tw-leading-6">
      <h1 className="tw-text-2xl tw-font-semibold">{t('page.dataExport.title')}</h1>
      <p className="tw-mt-2 tw-text-grey-dark2">{t('page.dataExport.lead')}</p>
      <ul className="tw-mt-3 tw-list-disc tw-ps-5 tw-text-grey-dark2">
        {CONTENTS.map((key) => (
          <li key={key}>{t(`page.dataExport.contents.${key}`)}</li>
        ))}
      </ul>
      <p className="tw-mt-3 tw-text-grey-dark2">{t('page.dataExport.access')}</p>

      {/* The one panel: what this page hands over, or why it cannot. */}
      <div
        className="tw-mt-6 tw-rounded-xl tw-border tw-border-solid tw-border-primary-violet tw-p-5"
        role="status"
        aria-live="polite"
      >
        {state === 'loading' && <p className="tw-text-grey-dark2">{t('page.everPlatform.loading')}</p>}
        {state === 'unavailable' && (
          <div data-testid="data-export-unavailable">
            <p className="tw-font-medium">{t('page.dataExport.unavailableTitle')}</p>
            <p className="tw-mt-1 tw-text-grey-dark2">{t('page.dataExport.unavailable')}</p>
          </div>
        )}
        {state === 'ready' && (
          <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-x-4 tw-gap-y-2">
            <Button
              type="primary"
              size="large"
              className={DOWNLOAD_BUTTON}
              onClick={download}
              data-testid="data-export-download"
            >
              {t('page.dataExport.download')}
            </Button>
            <span className="tw-break-all tw-text-xs tw-text-grey-dark2">{exportFileName(job)}</span>
          </div>
        )}
      </div>
    </section>
  );
};

export default DataExport;
