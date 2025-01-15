import * as styles from './IntegrationPage.module.scss';
import { jiraOauthUrl } from '@/app/services/api/messages';
import { disconnectJiraUser } from '@/app/services/general';
import {
  errorMessage,
  infoMessage,
} from '@/app/services/helpers/toastMessages';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import DisconnectServiceModal from '@/content/components/shared/DisconnectServiceModal';
import { useCallback, useState } from 'react';
import { RootStateOrAny, useSelector } from 'react-redux';
import ISettingsPageProps from '@/content/panel/screens/settingsScreen/interface/ISettingsPage';

const JiraPage: React.FC<ISettingsPageProps> = () => {
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
    const res = await disconnectJiraUser(user);
    if (res.status != 'error') {
      setLoading(false);
      setIsDisconnect(false);
      infoMessage('Successfully disconnected from Jira account.');
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
            path="/images/logo/jira-logo.svg"
            size="22px"
          />
          Jira Service
        </div>
      </h1>

      {user &&
      user.jira &&
      user.jira.isIntegrated &&
      user.jira.isIntegrated == true ? (
        <>
          <h2 className="tw-max-w-full tw-text-center">
            <div className="tw-flex tw-flex-col tw-gap-2 tw-justify-center">
              <div className="tw-mr-2">Connected to: </div>
              <div className="tw-flex">
                <span className="tw-text-primary-purple tw-font-bold">
                  {user.jira.email}
                </span>
              </div>
            </div>
          </h2>

          <div className="tw-w-90p">
            <AppButton
              className={styles.disconnectBtn}
              onClick={() => setIsDisconnect(true)}
              full={true}
            >
              Disconnect from Jira
            </AppButton>
          </div>
        </>
      ) : (
        <>
          <p className={styles.description}>
            You can connect your Jira account to add new ticket and upload
            screenshots captured by Rec.
          </p>
          <div className="tw-w-90p">
            <AppButton onClick={connectToAccount} full={true}>
              Continue with Jira
            </AppButton>
          </div>
        </>
      )}
      {!!isDisconnect && (
        <DisconnectServiceModal
          onCancel={() => setIsDisconnect(false)}
          onOk={disconnectJiraAccount}
          loading={loading}
          title={'Disconnect your Jira account?'}
          subTitle={
            "Are you sure you want to disable Jira integration? By disconnecting you won't be able to share your screenshots and videos."
          }
        />
      )}
    </div>
  );
};

export default JiraPage;
