import { RootStateOrAny, useSelector } from 'react-redux';
import { useCallback, useState } from 'react';
import { driveSignOut, DriveUser } from 'app/services/google/auth';
import AppButton from 'components/controls/AppButton';
import AppSvg from 'components/elements/AppSvg';
import { DriveFile, updateWorkingFolder } from 'app/services/google/drive';
//import activeImage from 'misc/activeImage';
import { useRouter } from 'next/router';
import useGoogleDriveAuth from 'hooks/useGoogleDriveAuth';
import { removeDriveUser } from 'app/services/google/user';
import DisconnectServiceModal from 'components/shared/DisconnectServiceModal';
import { errorMessage, infoMessage } from 'app/services/helpers/toastMessages';
import styles from './IntegrationPage.module.scss';
import { useTranslation } from 'react-i18next';
//import { useMenuItems } from 'misc/menuItems';

const Drive: React.FC = () => {
  const { t } = useTranslation();
  const driveUser: DriveUser | null = useSelector(
    (state: RootStateOrAny) => state.auth.driveUser,
  );
  const folders: DriveFile[] | null = useSelector(
    (state: RootStateOrAny) => state.drive.folders,
  );
  //const workingFolder: DriveFile | null = useSelector(
  //  (state: RootStateOrAny) => state.drive.workingFolder,
  //);
  const router = useRouter();
  //const { settingsMenuItems } = useMenuItems();
  //const { driveLogin } = useGoogleDriveAuth({ pathname: `/settings/drive` });
  const { driveLogin } = useGoogleDriveAuth({
    pathname: router.query?.id ? `/image/${router.query?.id}` : '/media/images',
  });

  const [isDisconnect, setIsDisconnect] = useState(false);
  const [loading, setLoading] = useState(false);

  const changeWorkingFolder = async (val: string) => {
    const folder = val ? folders?.find((folder) => folder.id === val) : null;
    await updateWorkingFolder(folder || null);
  };

  //const imagePath = activeImage(router, settingsMenuItems);

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
      errorMessage(err);
    }
  }, []);

  return (
    <div className={styles.mainWrapperItem}>
      <h1 className="tw-m-0 tw-text-sm tw-font-medium tw-text-foreground">
        <div className="tw-flex tw-h-7 tw-items-center">
          <AppSvg
            className="tw-mr-2"
            path="/settings/google-icon.svg"
            size="22px"
          />
          {t('page.integrations.googleDrive.title')}
        </div>
      </h1>

      {driveUser ? (
        <>
          <h2 className="tw-m-0 tw-max-w-full tw-text-[13px] tw-font-normal tw-leading-5 tw-text-muted-foreground">
            <div className="tw-flex tw-flex-col">
              <div>{t('page.integrations.connectedTo')}</div>
              <div className="tw-flex tw-min-w-0">
                <span className="tw-truncate tw-font-medium tw-text-foreground">
                  {driveUser.email}
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
              {t('page.integrations.googleDrive.disconnectGoogleDrive')}
            </AppButton>
          </div>
          {/*{folders.length > 0 && (*/}
          {/*  <div className="tw-flex tw-items-center">*/}
          {/*    <div className="tw-font-bold tw-mr-3">Working folder:</div>*/}
          {/*    <Select*/}
          {/*      value={workingFolder?.id || ''}*/}
          {/*      onChange={changeWorkingFolder}*/}
          {/*      className="tw-w-1/2 tw-border tw-border-app-grey tw-border-solid tw-rounded"*/}
          {/*    >*/}
          {/*      <Select.Option value="">/</Select.Option>*/}
          {/*      {folders.map((folder) => (*/}
          {/*        <Select.Option key={folder.id} value={folder.id}>*/}
          {/*          {folder.name}*/}
          {/*        </Select.Option>*/}
          {/*      ))}*/}
          {/*    </Select>*/}
          {/*  </div>*/}
          {/*)}*/}
        </>
      ) : (
        <>
          <p className={styles.description}>
            {t('page.integrations.googleDrive.description')}
          </p>
          <div className={styles.action}>
            <AppButton
              outlined
              twPadding="tw-px-4 tw-py-[7px]"
              onClick={async () => await driveLogin()}
              full={true}
            >
              {t('page.integrations.googleDrive.buttonText')}
            </AppButton>
          </div>
        </>
      )}
      {/*{imagePath && (*/}
      {/*  <DesignImage imagePath={imagePath} className="mx-xl:tw-hidden" />*/}
      {/*)}*/}
      {!!isDisconnect && (
        <DisconnectServiceModal
          onCancel={() => setIsDisconnect(false)}
          onOk={handleDriveSignOut}
          loading={loading}
          title={t('page.integrations.googleDrive.disconnectErrorTitle')}
          subTitle={t(
            'page.integrations.googleDrive.disconnectErrorDescription',
          )}
        />
      )}
    </div>
  );
};

export default Drive;
