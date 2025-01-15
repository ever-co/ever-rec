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

const SlackPage: React.FC<ISettingsPageProps> = () => {
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
      infoMessage('Successfully disconnected from Slack account.');
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
          Slack Integration
        </div>
      </h1>
      {user && user.isSlackIntegrate && user.isSlackIntegrate == true ? (
        <>
          <p className={styles.description}>
            You are successfully connected to slack, Now you can share your
            screenshots to your workspace.
          </p>
          <div className="tw-flex tw-mb-2">
            <AppSvg className="tw-mr-2" path="images/tools/success-tick.svg" />
            <div className="tw-font-medium">
              You&apos;re signed in with slack workspace
            </div>
          </div>
          <div className="tw-w-90p">
            <AppButton
              full={true}
              onClick={() => setIsDisconnect(true)}
              className={styles.disconnectBtn}
            >
              Disconnect from Slack
            </AppButton>
          </div>
        </>
      ) : (
        <>
          <p className={styles.description}>
            You can connect your slack workspace account to share screenshots
            and videos captured by Rec
          </p>
          <div className="tw-w-90p">
            <AppButton onClick={connectToAccount} full={true}>
              Connect with Slack
            </AppButton>
          </div>
        </>
      )}
      {!!isDisconnect && (
        <DisconnectServiceModal
          onCancel={() => setIsDisconnect(false)}
          onOk={disconnectUser}
          loading={loading}
          title={'Disconnect your Slack account?'}
          subTitle={
            "Are you sure you want to disable slack integration? By disconnecting you won't be able to share your screenshots and videos."
          }
        />
      )}
    </div>
  );
};

export default SlackPage;
