import { useTranslation } from 'react-i18next';
import { IEverConnectLadder } from 'app/services/ever-connect';

export const formatTime = (ms: number | null | undefined) =>
  ms ? new Date(ms).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '—';

/** The error code of an API answer, for a translated message. */
export const errorCodeOf = (error: any): string | null => {
  const code = error?.response?.data?.code ?? error?.response?.data?.message?.code;
  return typeof code === 'string' && /^[a-z_]{1,40}$/.test(code) ? code : null;
};

export const useErrorMessage = () => {
  const { t } = useTranslation();
  return (error: unknown) => {
    const code = errorCodeOf(error);
    return code
      ? t(`page.everPlatform.connect.errors.${code}`, t('page.everPlatform.errors.generic'))
      : t('page.everPlatform.errors.generic');
  };
};

/** The entitlement banner: grace (could not refresh since a date) or paused (reconnect). */
export const LadderBanner: React.FC<{ ladder: IEverConnectLadder | null | undefined }> = ({ ladder }) => {
  const { t } = useTranslation();
  if (!ladder || ladder.state === 'valid') return null;
  if (ladder.state === 'grace') {
    return (
      <p data-testid="ever-connect-banner-grace" className="tw-rounded tw-bg-yellow-50 tw-p-3">
        {t('page.everPlatform.connect.ladder.grace', { date: formatTime(ladder.refreshedAt) })}
      </p>
    );
  }
  return (
    <p data-testid={`ever-connect-banner-${ladder.state}`} className="tw-rounded tw-bg-red-50 tw-p-3">
      {t(`page.everPlatform.connect.ladder.${ladder.state}`)}
    </p>
  );
};
