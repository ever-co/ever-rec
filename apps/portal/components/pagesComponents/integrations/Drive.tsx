import { RootStateOrAny, useSelector } from 'react-redux';
import { useCallback, useState } from 'react';
import { driveSignOut, DriveUser } from 'app/services/google/auth';
import AppButton from 'components/controls/AppButton';
import AppSvg from 'components/elements/AppSvg';
import { DriveFile, updateWorkingFolder } from 'app/services/google/drive';
import activeImage from 'misc/activeImage';
import { useRouter } from 'next/router';
import useGoogleDriveAuth from 'hooks/useGoogleDriveAuth';
import { removeDriveUser } from 'app/services/google/user';
import DisconnectServiceModal from 'components/shared/DisconnectServiceModal';
import { errorMessage, infoMessage } from 'app/services/helpers/toastMessages';
import styles from './IntegrationPage.module.scss';

const Drive: React.FC = () => {
  const driveUser: DriveUser | null = useSelector(
    (state: RootStateOrAny) => state.auth.driveUser,
  );
  const folders: DriveFile[] | null = useSelector(
    (state: RootStateOrAny) => state.drive.folders,
  );
  const workingFolder: DriveFile | null = useSelector(
    (state: RootStateOrAny) => state.drive.workingFolder,
  );
  const router = useRouter();
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

  const imagePath = activeImage(router);

  const handleDriveSignOut = useCallback(async () => {
    setLoading(true);
    try {
      await driveSignOut();
      setLoading(false);
      setIsDisconnect(false);
      removeDriveUser();
      infoMessage('Successfully disconnected Google drive account');
    } catch (err) {
      setLoading(false);
      errorMessage(err);
    }
  }, []);

  return (
    <div className={styles.mainWrapperItem}>
      <h1 className="tw-font-semibold">
        <div className="tw-flex">
          <AppSvg
            className="tw-mr-2"
            path="/settings/google-icon.svg"
            size="22px"
          />
          Google Drive Integration
        </div>
      </h1>

      {driveUser ? (
        <>
          <h2>
            <div className="tw-flex">
              <div className="tw-mr-2">Connected to: </div>
              <div className="tw-flex">
                <span className="tw-text-primary-purple tw-font-bold">
                  {driveUser.email}
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
              Disconnect from Google Drive
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
            You can connect your Google Drive account to save screenshots and
            videos captured by Rec.
          </p>
          <div className="tw-w-90p">
            <AppButton onClick={async () => await driveLogin()} full={true}>
              Continue with Google Drive
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
          title={'Disconnect your Google account?'}
          subTitle={
            "Are you sure you want to disable Google drive integration? By disconnecting you won't be able to sync your screenshots."
          }
        />
      )}
    </div>
  );
};

export default Drive;
