import { useTranslation } from 'react-i18next';
import { IEverConnectLadder } from 'app/services/ever-connect';

export const formatTime = (ms: number | null | undefined) =>
  ms ? new Date(ms).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '—';

/** The error code of an API answer, for a translated message. */
export const errorCodeOf = (error: any): string | null => {
  const code =
    error?.response?.data?.code ?? error?.response?.data?.message?.code;
  return typeof code === 'string' && /^[a-z_]{1,40}$/.test(code) ? code : null;
};

export const useErrorMessage = () => {
  const { t } = useTranslation();
  return (error: unknown) => {
    const code = errorCodeOf(error);
    return code
      ? t(
          `page.everPlatform.connect.errors.${code}`,
          t('page.everPlatform.errors.generic'),
        )
      : t('page.everPlatform.errors.generic');
  };
};

// The looks the Ever Platform panels share (Tailwind classes on the shared Ever tokens).

/** The title of a panel's section. */
export const SECTION_TITLE =
  'tw-m-0 tw-text-base tw-font-semibold tw-text-foreground';

/** The title of a block inside a section. */
export const BLOCK_TITLE =
  'tw-m-0 tw-text-sm tw-font-medium tw-text-foreground';

/** A quiet line of explanation. */
export const MUTED_TEXT =
  'tw-m-0 tw-text-[13px] tw-leading-5 tw-text-muted-foreground';

/** A field: its label above the control. */
export const FIELD_LABEL =
  'tw-flex tw-max-w-md tw-flex-col tw-gap-1.5 tw-text-[13px] tw-font-medium tw-text-foreground';

/** The answer of the last action (done, or the error message). */
export const NOTICE =
  'tw-m-0 tw-rounded-md tw-border tw-border-solid tw-border-border tw-bg-muted tw-px-3 tw-py-2 tw-text-sm tw-text-foreground';

/** An antd Select as a bordered control (the global re-skin leaves the border to its container). */
export const SELECT =
  'tw-rounded-md tw-border tw-border-solid tw-border-input tw-transition-[border-color,box-shadow] tw-duration-150 [&.ant-select-focused]:tw-border-ring [&.ant-select-focused]:tw-shadow-[0_0_0_3px_hsl(var(--ring)/0.2)]';

/** A machine value (an id, a field path, a payload). */
export const CODE = 'tw-font-mono tw-text-xs tw-text-foreground';

/** A block of JSON. */
export const PAYLOAD =
  'tw-m-0 tw-overflow-auto tw-rounded-lg tw-border tw-border-solid tw-border-border tw-bg-muted tw-p-4 tw-font-mono tw-text-xs tw-leading-5 tw-text-foreground';

/** A plain data table: quiet head, hairline rows. */
export const TABLE =
  'tw-w-full tw-border-collapse tw-text-start tw-text-[13px] tw-leading-5 tw-text-foreground [&_td]:tw-border-b [&_td]:tw-border-solid [&_td]:tw-border-border [&_td]:tw-px-3 [&_td]:tw-py-2 [&_td]:tw-align-top [&_th]:tw-border-b [&_th]:tw-border-solid [&_th]:tw-border-border [&_th]:tw-px-3 [&_th]:tw-py-2 [&_th]:tw-text-xs [&_th]:tw-font-medium [&_th]:tw-text-muted-foreground [&_tr:last-child>td]:tw-border-b-0';

/** The frame around a table: a card that scrolls sideways when the table is wider. */
export const TABLE_FRAME =
  'tw-overflow-x-auto tw-rounded-[0.75rem] tw-border tw-border-solid tw-border-border tw-bg-card';

/** A list of label / value rows on a card. Put `DetailRow`s inside. */
export const DETAIL_LIST =
  'tw-m-0 tw-rounded-[0.75rem] tw-border tw-border-solid tw-border-border tw-bg-card tw-px-4';

/** One label / value row of a `DETAIL_LIST`. */
export const DetailRow: React.FC<{
  label: React.ReactNode;
  testId?: string;
  children: React.ReactNode;
}> = ({ label, testId, children }) => (
  <div className="tw-flex tw-flex-wrap tw-items-baseline tw-justify-between tw-gap-x-6 tw-gap-y-1 tw-border-0 tw-border-b tw-border-solid tw-border-border tw-py-3 last:tw-border-b-0">
    <dt className="tw-text-[13px] tw-font-normal tw-leading-5 tw-text-muted-foreground">
      {label}
    </dt>
    <dd
      data-testid={testId}
      className="tw-m-0 tw-min-w-0 tw-break-words tw-text-end tw-text-sm tw-tabular-nums tw-text-foreground [&_code]:tw-font-mono [&_code]:tw-text-xs"
    >
      {children}
    </dd>
  </div>
);

/** A plain stat tile: a quiet label over its value. Put inside a `<dl>` grid. */
export const StatTile: React.FC<{
  label: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="tw-min-w-0 tw-rounded-[0.75rem] tw-border tw-border-solid tw-border-border tw-bg-card tw-p-4">
    <dt className="tw-text-[13px] tw-font-normal tw-leading-5 tw-text-muted-foreground">
      {label}
    </dt>
    <dd className="tw-m-0 tw-mt-1 tw-break-words tw-text-xl tw-font-semibold tw-tabular-nums tw-text-foreground [&_code]:tw-break-all [&_code]:tw-font-mono [&_code]:tw-text-base [&_code]:tw-font-medium">
      {children}
    </dd>
  </div>
);

/** The entitlement banner: grace (could not refresh since a date) or paused (reconnect). */
export const LadderBanner: React.FC<{
  ladder: IEverConnectLadder | null | undefined;
}> = ({ ladder }) => {
  const { t } = useTranslation();
  if (!ladder || ladder.state === 'valid') return null;
  if (ladder.state === 'grace') {
    return (
      <p
        data-testid="ever-connect-banner-grace"
        className="tw-m-0 tw-rounded-lg tw-bg-[hsl(var(--warning-muted))] tw-px-4 tw-py-3 tw-text-sm tw-text-warning"
      >
        {t('page.everPlatform.connect.ladder.grace', {
          date: formatTime(ladder.refreshedAt),
        })}
      </p>
    );
  }
  return (
    <p
      data-testid={`ever-connect-banner-${ladder.state}`}
      className="tw-m-0 tw-rounded-lg tw-bg-destructive-muted tw-px-4 tw-py-3 tw-text-sm tw-text-destructive-text"
    >
      {t(`page.everPlatform.connect.ladder.${ladder.state}`)}
    </p>
  );
};
