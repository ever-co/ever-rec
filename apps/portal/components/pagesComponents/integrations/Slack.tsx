import { RootStateOrAny, useSelector } from 'react-redux';
import AppButton from 'components/controls/AppButton';
import AppSvg from 'components/elements/AppSvg';
import ISettingsPageProps from 'app/interfaces/ISettingsPage';
import {
  disconnectSlackUser,
  getSlackLoginUrl,
} from 'app/services/screenshots';
import { useCallback, useState } from 'react';
import { errorMessage, infoMessage } from 'app/services/helpers/toastMessages';
import DisconnectServiceModal from 'components/shared/DisconnectServiceModal';
import styles from './IntegrationPage.module.scss';
import { useTranslation } from 'react-i18next';

const Slack: React.FC<ISettingsPageProps> = () => {
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const { t } = useTranslation();
  const [isDisconnect, setIsDisconnect] = useState(false);
  const [loading, setLoading] = useState(false);

  const connectToAccount = async () => {
    const res = await getSlackLoginUrl();
    if (res.status != 'error') {
      window.open(res, '_blank');
    } else {
      errorMessage(res.message);
    }
  };

  const disconnectUser = useCallback(async () => {
    setLoading(true);
    const res = await disconnectSlackUser();
    if (res.status != 'error') {
      setLoading(false);
      setIsDisconnect(false);
      infoMessage(t('toasts.slackDisconnected'));
    } else {
      setLoading(false);
      errorMessage(res.message);
    }
  }, []);

  return (
    <div className={styles.mainWrapperItem}>
      <h1 className="tw-m-0 tw-text-sm tw-font-medium tw-text-foreground">
        <div className="tw-flex tw-h-7 tw-items-center">
          <AppSvg
            className="tw-mr-2"
            path="/settings/slack-icon.svg"
            size="22px"
          />
          {t('page.integrations.slack.title')}
        </div>
      </h1>
      {user && user.isSlackIntegrate && user.isSlackIntegrate === true ? (
        <>
          <p className={styles.description}>
            {t('page.integrations.slack.description')}
          </p>
          <div className="tw-flex tw-items-start tw-gap-2 tw-text-[13px] tw-leading-5 tw-text-foreground">
            <AppSvg
              path="/settings/success.svg"
              size="16px"
              className="tw-mt-0.5 tw-shrink-0"
            />

            <div>{t('page.integrations.slack.slackWorkspace')}</div>
          </div>
          <div className={styles.action}>
            <AppButton
              full={true}
              onClick={() => setIsDisconnect(true)}
              bgColor="tw-bg-transparent hover:tw-bg-destructive-muted"
              twTextColor="tw-text-destructive-text"
              twPadding="tw-px-4 tw-py-[7px]"
            >
              {t('page.integrations.slack.disconnectSlack')}
            </AppButton>
          </div>
        </>
      ) : (
        <>
          <p className={styles.description}>
            {t('page.integrations.slack.connectedSlack')}
          </p>
          <div className={styles.action}>
            <AppButton
              outlined
              twPadding="tw-px-4 tw-py-[7px]"
              onClick={connectToAccount}
              full={true}
            >
              {t('page.integrations.slack.connectWithSlack')}
            </AppButton>
          </div>
        </>
      )}
      {!!isDisconnect && (
        <DisconnectServiceModal
          onCancel={() => setIsDisconnect(false)}
          onOk={disconnectUser}
          loading={loading}
          title={t('page.integrations.slack.disconnectErrorTitle')}
          subTitle={t('page.integrations.slack.disconnectErrorDescription')}
        />
      )}
    </div>
  );
};

export default Slack;
