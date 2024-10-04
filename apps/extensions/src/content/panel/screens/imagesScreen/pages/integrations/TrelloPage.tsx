import { useCallback, useEffect, useState } from 'react';
import * as styles from './IntegrationPage.module.scss';
import { RootStateOrAny, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { trelloOauthUrl } from '@/app/services/api/messages';
import { disconnectTrelloUser, trelloSaveToken } from '@/app/services/general';
import {
  errorMessage,
  infoMessage,
} from '@/app/services/helpers/toastMessages';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import DisconnectServiceModal from '@/content/components/shared/DisconnectServiceModal';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import ISettingsPageProps from '@/content/panel/screens/settingsScreen/interface/ISettingsPage';

const TrelloPage: React.FC<ISettingsPageProps> = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const [isDisconnect, setIsDisconnect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isLoaded && window.location.hash) {
      setLoaded(true);
      handleSaveToken(window.location.hash);
    }
  }, []);

  const handleSaveToken = useCallback(async (token: string) => {
    const res = await trelloSaveToken(token);
    if (res.status == 'error') {
      errorMessage(res.message);
    }
    navigate(panelRoutes.integrations.path);
  }, []);

  const connectToAccount = async () => {
    const res = await trelloOauthUrl();
    if (res.status != 'error') {
      window.open(res, '_blank');
    } else {
      errorMessage(res.message);
    }
  };

  const disconnectTrelloAccount = useCallback(async () => {
    setLoading(true);
    const res = await disconnectTrelloUser(user);
    if (res.status != 'error') {
      setLoading(false);
      setIsDisconnect(false);
      infoMessage('Successfully disconnected trello account');
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
            size="22px"
            className="tw-mr-2"
            path="/images/logo/trello-logo.svg"
          />
          Trello Service
        </div>
      </h1>

      {user &&
      user.trello &&
      user.trello.isIntegrated &&
      user.trello.isIntegrated == true ? (
        <>
          <h2>
            <div className="tw-flex">
              <div className="tw-mr-2">Connected to: </div>
              <div className="tw-flex">
                <span className="tw-text-primary-purple tw-font-bold">
                  {user.trello.email}
                </span>
              </div>
            </div>
          </h2>
          <div className="tw-w-90p">
            <AppButton
              full={true}
              className={styles.disconnectBtn}
              onClick={() => setIsDisconnect(true)}
            >
              Disconnect from Trello
            </AppButton>
          </div>
        </>
      ) : (
        <>
          <p className={styles.description}>
            You can connect your Trello account to add new ticket and upload
            screenshots captured by Rec.
          </p>
          <div className="tw-w-90p">
            <AppButton onClick={connectToAccount} full={true}>
              Continue with Trello
            </AppButton>
          </div>
        </>
      )}

      {!!isDisconnect && (
        <DisconnectServiceModal
          onCancel={() => setIsDisconnect(false)}
          onOk={disconnectTrelloAccount}
          loading={loading}
          title={'Disconnect your Trello account?'}
          subTitle={
            "Are you sure you want to disable Trello integration? By disconnecting you won't be able to share your screenshots and videos."
          }
        />
      )}
    </div>
  );
};

export default TrelloPage;
