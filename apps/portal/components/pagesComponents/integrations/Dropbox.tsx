import { RootStateOrAny, useSelector } from 'react-redux';
import AppButton from 'components/controls/AppButton';
import AppSvg from 'components/elements/AppSvg';
import { useCallback, useState } from 'react';
import { errorMessage, infoMessage } from 'app/services/helpers/toastMessages';
import {
  disconnectDropboxUser,
  getDropBoxLoginUrl,
} from 'app/services/general';
import DisconnectServiceModal from 'components/shared/DisconnectServiceModal';
import styles from './IntegrationPage.module.scss';
import { useTranslation } from 'react-i18next';

const Dropbox: React.FC = () => {
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
    const res = await disconnectDropboxUser();
    if (res.status != 'error') {
      setLoading(false);
      setIsDisconnect(false);
      infoMessage(t('toasts.dropBoxDisconnected'));
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
            className="tw-me-2"
            path="/settings/dropbox.svg"
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
          <h2 className="tw-m-0 tw-max-w-full tw-text-[13px] tw-font-normal tw-leading-5 tw-text-muted-foreground">
            <div className="tw-flex tw-flex-col">
              <div>{t('page.integrations.connectedTo')}</div>
              <div className="tw-flex tw-min-w-0">
                <span className="tw-truncate tw-font-medium tw-text-foreground">
                  {user.dropbox.email}
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
              {t('page.integrations.dropbox.disconnectDropbox')}
            </AppButton>
          </div>
        </>
      ) : (
        <>
          <p className={styles.description}>
            {t('page.integrations.dropbox.connectDropbox')}
          </p>
          <div className={styles.action}>
            <AppButton
              outlined
              twPadding="tw-px-4 tw-py-[7px]"
              onClick={connectToAccount}
              full={true}
            >
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

export default Dropbox;
