import { RootStateOrAny, useSelector } from 'react-redux';
import AppButton from 'components/controls/AppButton';
import AppSvg from 'components/elements/AppSvg';
import { useCallback, useState } from 'react';
import { errorMessage, infoMessage } from 'app/services/helpers/toastMessages';
import { disconnectJiraUser } from 'app/services/general';
import DisconnectServiceModal from 'components/shared/DisconnectServiceModal';
import { jiraOauthUrl } from 'app/services/api/messages';
import styles from './IntegrationPage.module.scss';
import { useTranslation } from 'react-i18next';

const Jira: React.FC = () => {
  const { t } = useTranslation();
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const [isDisconnect, setIsDisconnect] = useState(false);
  const [loading, setLoading] = useState(false);

  const connectToAccount = async () => {
    const res = await jiraOauthUrl();
    if (res.status != 'error') {
      window.open(res, '_blank');
    } else {
      errorMessage(res.message);
    }
  };

  const disconnectJiraAccount = useCallback(async () => {
    setLoading(true);
    const res = await disconnectJiraUser();
    if (res.status != 'error') {
      setLoading(false);
      setIsDisconnect(false);
      infoMessage(t('toasts.jiraDisconnected'));
    } else {
      setLoading(false);
      errorMessage(res.message);
    }
  }, []);

  return (
    <div className={styles.mainWrapperItem}>
      <h1 className="tw-m-0 tw-text-sm tw-font-medium tw-text-foreground">
        <div className="tw-flex tw-h-7 tw-items-center">
          <AppSvg className="tw-me-2" path="/settings/jira.svg" size="22px" />
          {t('page.integrations.jira.title')}
        </div>
      </h1>

      {user &&
      user.jira &&
      user.jira.isIntegrated &&
      user.jira.isIntegrated == true ? (
        <>
          <h2 className="tw-m-0 tw-max-w-full tw-text-[13px] tw-font-normal tw-leading-5 tw-text-muted-foreground">
            <div className="tw-flex tw-flex-col">
              <div>{t('page.integrations.connectedTo')}</div>
              <div className="tw-flex tw-min-w-0">
                <span className="tw-truncate tw-font-medium tw-text-foreground">
                  {user.jira.email}
                </span>
              </div>
            </div>
          </h2>

          <div className={styles.action}>
            <AppButton
              bgColor="tw-bg-transparent hover:tw-bg-destructive-muted"
              twTextColor="tw-text-destructive-text"
              twPadding="tw-px-4 tw-py-[7px]"
              onClick={() => setIsDisconnect(true)}
              full={true}
            >
              {t('page.integrations.jira.disconnectFromJira')}
            </AppButton>
          </div>
        </>
      ) : (
        <>
          <p className={styles.description}>
            {t('page.integrations.jira.description')}
          </p>
          <div className={styles.action}>
            <AppButton
              outlined
              twPadding="tw-px-4 tw-py-[7px]"
              onClick={connectToAccount}
              full={true}
            >
              {t('page.integrations.jira.buttonText')}
            </AppButton>
          </div>
        </>
      )}
      {!!isDisconnect && (
        <DisconnectServiceModal
          onCancel={() => setIsDisconnect(false)}
          onOk={disconnectJiraAccount}
          loading={loading}
          title={t('page.integrations.jira.disconnectErrorTitle')}
          subTitle={t('page.integrations.jira.disconnectErrorDescription')}
        />
      )}
    </div>
  );
};

export default Jira;
