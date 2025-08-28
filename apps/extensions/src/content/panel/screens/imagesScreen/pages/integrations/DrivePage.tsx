import { useCallback, useEffect, useState } from 'react';
import browser from '@/app/utilities/browser';
import * as styles from './IntegrationPage.module.scss';
import AuthAC from '@/app/store/auth/actions/AuthAC';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { driveSignOut, DriveUser } from '@/app/services/google/auth';
import { removeDriveUser } from '@/app/services/google/user';
import { IAppMessage } from '@/app/messagess';
import ISettingsPageProps from '@/content/panel/screens/settingsScreen/interface/ISettingsPage';
import DisconnectServiceModal from '@/content/components/shared/DisconnectServiceModal';
import {
  errorMessage,
  infoMessage,
} from '@/app/services/helpers/toastMessages';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import { useTranslation } from 'react-i18next';

const DrivePage: React.FC<ISettingsPageProps> = ({ imagePath }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const driveUser: DriveUser = useSelector(
    (state: RootStateOrAny) => state.auth.driveUser,
  );
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null);
  const [isDisconnect, setIsDisconnect] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    browser.runtime.onMessageExternal.addListener(externalListener);
  }, [tab]);

  const externalListener = useCallback(
    async (message: IAppMessage) => {
      if (message.action === 'setDriveUser') {
        try {
          tab && tab.id && (await chrome.tabs.remove(tab.id));
        } catch (e) {
          console.log(e);
        }

        const driveUser = message.payload;
        browser.storage.local.set({ driveUser });
        dispatch(AuthAC.setDriveUser({ driveUser }));
      }
    },
    [tab],
  );

  const connectToAccount = async () => {
    const tab = await browser.tabs.create({
      url: `${process.env.WEBSITE_URL}/auth/google-auth?driveLogin=true`,
    });

    setTab(tab);
  };

  const handleDriveSignOut = useCallback(async () => {
    setLoading(true);
    try {
      await driveSignOut();
      setLoading(false);
      setIsDisconnect(false);
      removeDriveUser();
      infoMessage(t('toasts.googleDriveDisconnected'));
    } catch (err) {
      setLoading(false);
      errorMessage(t('toasts.somethingWentWrong'));
    }
  }, [user]);

  return (
    <div className={styles.mainWrapperItem}>
      <h1 className="tw-font-semibold">
        <div className="tw-flex">
          <AppSvg
            className="tw-mr-2"
            path="images/panel/settings/google-icon.svg"
            size="22px"
          />
         {t('page.integrations.googleDrive.title')}
        </div>
      </h1>

      {driveUser ? (
        <>
          <h2 className="tw-max-w-full tw-text-center">
            <div className="tw-flex tw-flex-col tw-gap-2 tw-justify-center">
              <div className="tw-mr-2">{t('page.integrations.connectedTo')}</div>
              <div className="tw-flex">
                <span className="tw-text-primary-purple tw-font-bold">
                  {driveUser.email}
                </span>
              </div>
            </div>
          </h2>

          <div className="tw-w-90p">
            <AppButton
              full
              className={styles.disconnectBtn}
              onClick={() => setIsDisconnect(true)}
            >
             {t('page.integrations.googleDrive.disconnectGoogleDrive')}
            </AppButton>
          </div>
        </>
      ) : (
        <>
          <p className={styles.description}>
           {t('page.integrations.googleDrive.description')}
          </p>
          <div className="tw-w-90p">
            <AppButton full onClick={connectToAccount}>
             {t('page.integrations.googleDrive.buttonText')}
            </AppButton>
          </div>
        </>
      )}

      {!!isDisconnect && (
        <DisconnectServiceModal
          title={t('page.integrations.googleDrive.disconnectErrorTitle')}
          subTitle={t(
            'page.integrations.googleDrive.disconnectErrorDescription',
          )}
          loading={loading}
          onOk={handleDriveSignOut}
          onCancel={() => setIsDisconnect(false)}
        />
      )}
    </div>
  );
};

export default DrivePage;
