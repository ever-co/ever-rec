import { useState, useCallback } from 'react';
import styles from './IntegrationPage.module.scss';
import { RootStateOrAny, useSelector } from 'react-redux';
import {
  getDropBoxLoginUrl,
  disconnectDropboxUser,
} from '@/app/services/general';
import {
  errorMessage,
  infoMessage,
} from '@/app/services/helpers/toastMessages';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import DisconnectServiceModal from '@/content/components/shared/DisconnectServiceModal';
import ISettingsPageProps from '@/content/panel/screens/settingsScreen/interface/ISettingsPage';

const DropboxPage: React.FC<ISettingsPageProps> = () => {
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const [isDisconnect, setIsDisconnect] = useState(false);
  const [loading, setLoading] = useState(false);

  const connectToAccount = async () => {
    const res = await getDropBoxLoginUrl();

    if (res.status != 'error') {
      window.open(res, '_blank');
    } else {
      errorMessage(res.message);
    }
  };

  const disconnectUser = useCallback(async () => {
    setLoading(true);

    const res = await disconnectDropboxUser(user);

    if (res.status != 'error') {
      setLoading(false);
      setIsDisconnect(false);
      infoMessage('Successfully disconnected from Dropbox account.');
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
            path="/images/logo/dropbox-logo.svg"
            size="26px"
          />
          Dropbox Service
        </div>
      </h1>

      {user &&
      user.dropbox &&
      user.dropbox.isDropBoxIntegrated &&
      user.dropbox.isDropBoxIntegrated == true ? (
        <>
          <h2>
            <div className="tw-flex">
              <div className="tw-mr-2">Connected to: </div>
              <div className="tw-flex">
                <span className="tw-text-primary-purple tw-font-bold">
                  {user.dropbox.email}
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
              Disconnect from Dropbox
            </AppButton>
          </div>
        </>
      ) : (
        <>
          <p className={styles.description}>
            You can connect your DropBox account to save screenshots captured by
            Rec.
          </p>
          <div className="tw-w-90p">
            <AppButton onClick={connectToAccount} full={true}>
              Continue with DropBox
            </AppButton>
          </div>
        </>
      )}

      {!!isDisconnect && (
        <DisconnectServiceModal
          onCancel={() => setIsDisconnect(false)}
          onOk={disconnectUser}
          loading={loading}
          title={'Disconnect your Dropbox account?'}
          subTitle={
            "Are you sure you want to disable Dropbox integration? By disconnecting you won't be able to share your screenshots and videos."
          }
        />
      )}
    </div>
  );
};

export default DropboxPage;
