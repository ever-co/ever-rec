import { useCallback, useState } from 'react';
import { RootStateOrAny, useSelector } from 'react-redux';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import ISettingsPageProps from '@/content/panel/screens/settingsScreen/interface/ISettingsPage';
import {
  errorMessage,
  infoMessage,
} from '@/app/services/helpers/toastMessages';
import {
  disconnectSlackUser,
  getSlackLoginUrl,
} from '@/app/services/screenshots';
//@ts-ignore
import * as styles from './IntegrationPage.module.scss';
import DisconnectServiceModal from '@/content/components/shared/DisconnectServiceModal';
import { useTranslation } from 'react-i18next';

const SlackPage: React.FC<ISettingsPageProps> = () => {
  const { t } = useTranslation();
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
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
    const res = await disconnectSlackUser(user);
    if (res.status != 'error') {
      setLoading(false);
      setIsDisconnect(false);
      infoMessage(t('toasts.slackDisconnected'));
    } else {
      setLoading(false);
      errorMessage(res.message);
    }
  }, [user]);

  return (
    <div className={styles.mainWrapperItem}>
      <h1 className="tw-font-semibold">
        <div className="tw-flex">
          <AppSvg
            className="tw-mr-2"
            path="images/panel/settings/slack-icon.svg"
            size="22px"
          />
          {t('page.integrations.slack.title')}
        </div>
      </h1>
      {user && user.isSlackIntegrate && user.isSlackIntegrate == true ? (
        <>
          <p className={styles.description}>
            {t('page.integrations.slack.description')}
          </p>
          <div className="tw-flex tw-mb-2">
            <AppSvg className="tw-mr-2" path="images/tools/success-tick.svg" />
            <div className="tw-font-medium">
              {t('page.integrations.slack.slackWorkspace')}
            </div>
          </div>
          <div className="tw-w-90p">
            <AppButton
              full={true}
              onClick={() => setIsDisconnect(true)}
              className={styles.disconnectBtn}
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
          <div className="tw-w-90p">
            <AppButton onClick={connectToAccount} full={true}>
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

export default SlackPage;
