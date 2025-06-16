import { useState, useCallback } from 'react';
import * as styles from './IntegrationPage.module.scss';
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
import { useTranslation } from 'react-i18next';

const DropboxPage: React.FC<ISettingsPageProps> = () => {
  const { t } = useTranslation();
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
      infoMessage(t('toasts.dropBoxDisconnected'));
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
          {t('page.integrations.dropbox.title')}
        </div>
      </h1>

      {user &&
      user.dropbox &&
      user.dropbox.isDropBoxIntegrated &&
      user.dropbox.isDropBoxIntegrated == true ? (
        <>
          <h2 className="tw-max-w-full tw-text-center">
            <div className="tw-flex tw-flex-col tw-gap-2 tw-justify-center">
              <div className="tw-mr-2">
                {t('page.integrations.connectedTo')}
              </div>
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
              {t('page.integrations.dropbox.disconnectDropbox')}
            </AppButton>
          </div>
        </>
      ) : (
        <>
          <p className={styles.description}>
            {t('page.integrations.dropbox.connectDropbox')}
          </p>
          <div className="tw-w-90p">
            <AppButton onClick={connectToAccount} full={true}>
              {t('page.integrations.dropbox.buttonText')}
            </AppButton>
          </div>
        </>
      )}

      {!!isDisconnect && (
        <DisconnectServiceModal
          onCancel={() => setIsDisconnect(false)}
          onOk={disconnectUser}
          loading={loading}
          title={t('page.integrations.dropbox.disconnectErrorTitle')}
          subTitle={t('page.integrations.dropbox.disconnectErrorDescription')}
        />
      )}
    </div>
  );
};

export default DropboxPage;
