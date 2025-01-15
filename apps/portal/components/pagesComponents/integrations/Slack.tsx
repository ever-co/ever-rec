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

const Slack: React.FC<ISettingsPageProps> = () => {
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
    const res = await disconnectSlackUser();
    if (res.status != 'error') {
      setLoading(false);
      setIsDisconnect(false);
      infoMessage('Successfully disconnected slack account');
    } else {
      setLoading(false);
      errorMessage(res.message);
    }
  }, []);

  return (
    <div className={styles.mainWrapperItem}>
      <h1 className="tw-font-semibold">
        <div className="tw-flex tw-align-end">
          <AppSvg
            className="tw-mr-2"
            path="/settings/slack-icon.svg"
            size="22px"
          />
          Slack Integration
        </div>
      </h1>
      {user && user.isSlackIntegrate && user.isSlackIntegrate === true ? (
        <>
          <p className={styles.description}>
            You are successfully connected to slack, Now you can share your
            screenshots to your workspace.
          </p>
          <div className="tw-flex tw-mb-2 tw-justify-center tw-text-center tw-gap-1 tw-mt-3 tw-mx-4">
            <AppSvg path="/settings/success.svg" size="22px" />

            <div>You&apos;re signed in with slack workspace</div>
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

export default Slack;
