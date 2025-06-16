import { useCallback, useEffect, useState } from 'react';
import styles from './SaveToCloudModal.module.scss';
import classNames from 'classnames';
import AppSpinnerLocal from 'components/containers/appSpinnerLocal/AppSpinnerLocal';
import AppButton from 'components/controls/AppButton';
import { IoCopyOutline } from 'react-icons/io5';
import PanelAC from 'app/store/panel/actions/PanelAC';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { Modal } from 'antd';
import AppSvg from 'components/elements/AppSvg';
import useCloudSaveButtons from 'hooks/useCloudSaveButtons';
import { DriveUser } from 'app/services/google/auth';
import useGoogleDriveAuth from 'hooks/useGoogleDriveAuth';
import { useRouter } from 'next/router';
import { panelRoutes, preRoutes } from 'components/_routes';
import { useTranslation } from 'react-i18next';

const SaveToCloudModal = ({ user, visible, item, onCancel }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const driveUser: DriveUser | null = useSelector(
    (state: RootStateOrAny) => state.auth.driveUser,
  );
  const {
    cloudBtnsRefs,
    onMouseEnterCloudButtonsHandler,
    onMouseLeaveCloudButtonsHandler,
  } = useCloudSaveButtons({
    hiddenClass: styles.hoveredHidden,
    activeClass: styles.hoveredActive,
  });
  const { driveLogin } = useGoogleDriveAuth({
    pathname: router.query?.id ? `/video/${router.query?.id}` : '/media/videos',
  });
  const [driveOperationLoading, setDriveOperationLoading] = useState(false);
  const [driveVideoId, setDriveVideoId] = useState<string | null>('');
  const [uploadToCloudModalState, setUploadToCloudModalState] = useState(false);
  const [showCloudDeleteFileModal, setShowCloudDeleteFileModal] = useState<
    string | null
  >(null);
  const [dropBoxImageId, setDropBoxImageId] = useState('');
  const [dropboxOperationLoading, setDropboxOperationLoading] = useState(false);
  const [uploadToCloudType, setUploadToCloudType] = useState<string | null>(
    null,
  );

  const openVideoOnDrive = async () => {
    driveVideoId &&
      driveUser &&
      window &&
      window
        .open(`https://drive.google.com/file/d/${driveVideoId}/view`, '_blank')
        ?.focus();
  };

  const openVideoOnDropBox = async () => {
    dropBoxImageId &&
      window &&
      window
        .open(
          `https://www.dropbox.com/home/Apps/Rec?preview=${dropBoxImageId}`,
          '_blank',
        )
        ?.focus();
  };

  const openUploadToDropBoxCloudModal = useCallback(
    (type) => {
      if (user?.dropbox?.isDropBoxIntegrated) {
        setUploadToCloudType(type);
        setUploadToCloudModalState(true);
      } else {
        router.push(preRoutes.media + panelRoutes.integrations);
      }
    },
    [user, router],
  );

  const openUploadToCloudModal = async () => {
    if (driveUser) {
      setUploadToCloudModalState(true);
    } else {
      await driveLogin();
    }
  };

  return (
    <Modal
      open={visible}
      closable
      closeIcon={
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
      }
      footer={null}
      onCancel={onCancel}
    >
      <div className="tw-font-semibold tw-text-sm tw-mb-2 tw-text-center">
        {t('page.image.saveToCloud')}
      </div>
      <div className={styles.cloudProvidersWrapper}>
        <div
          ref={cloudBtnsRefs[0]}
          onMouseEnter={() => onMouseEnterCloudButtonsHandler(0)}
          onMouseLeave={onMouseLeaveCloudButtonsHandler}
          className={`${styles.cloudProviderButton}`}
        >
          {driveOperationLoading ? (
            <AppButton
              className={styles.appButton}
              twPadding="tw-px-0 tw-py-3"
              twRounded="tw-rounded-none"
              onClick={() => void 0}
            >
              <div
                className={classNames(
                  styles.svgWrapper,
                  styles.loader,
                  'tw-flex',
                )}
              >
                <div className={styles.localAppSpinnerWrapper}>
                  <AppSpinnerLocal circleInnerColor="#5b4dbe" />
                </div>
              </div>
              <div className={styles.providerText}>
                <div className={styles.openVideoText}>
                  {t('page.image.processing')}
                </div>
              </div>
            </AppButton>
          ) : (
            <AppButton
              className={styles.appButton}
              twPadding="tw-px-0 tw-py-3"
              twRounded="tw-rounded-none"
              onClick={
                driveVideoId && driveUser
                  ? openVideoOnDrive
                  : openUploadToCloudModal
              }
            >
              <div className={classNames(styles.svgWrapper, 'tw-flex')}>
                <AppSvg path="/images/google-drive-logo.svg" size="25px" />
                <div className={styles.providerText}>
                  {driveVideoId && driveUser ? (
                    <div className={styles.openVideoText}>
                      {t('page.image.openVideo')}
                    </div>
                  ) : (
                    driveUser?.email || 'Google drive'
                  )}
                </div>
              </div>
            </AppButton>
          )}
          {driveVideoId && (
            <AppButton
              onMouseLeave={onMouseLeaveCloudButtonsHandler}
              onClick={() => setShowCloudDeleteFileModal('drive')}
              className={styles.deleteDriveItemBtn}
            >
              <AppSvg size="24px" path="/images/delete-bin.svg" />
            </AppButton>
          )}
        </div>
        <div
          ref={cloudBtnsRefs[1]}
          onMouseEnter={() => onMouseEnterCloudButtonsHandler(1)}
          onMouseLeave={onMouseLeaveCloudButtonsHandler}
          className={`${styles.cloudProviderButton}`}
        >
          <AppButton
            onClick={() =>
              dropBoxImageId
                ? openVideoOnDropBox()
                : openUploadToDropBoxCloudModal('dropbox')
            }
            twPadding="tw-px-0 tw-py-3"
            className={styles.appButton}
            twRounded="tw-rounded-none"
          >
            {dropboxOperationLoading ? (
              <div
                className={classNames(
                  styles.svgWrapper,
                  styles.loader,
                  'tw-flex',
                )}
              >
                <div className={styles.localAppSpinnerWrapper}>
                  <AppSpinnerLocal circleInnerColor="#5b4dbe" />
                </div>
                <div className={styles.providerText}>
                  <div className={styles.openImageText}>
                    {t('page.image.processing')}
                  </div>
                </div>
              </div>
            ) : (
              <div className={classNames(styles.svgWrapper, 'tw-flex')}>
                <AppSvg path="/images/dropbox-logo.svg" size="25px" />
                <div className={styles.providerText}>
                  {dropBoxImageId
                    ? t('page.image.openVideo')
                    : user?.dropbox?.email || 'Dropbox'}
                </div>
              </div>
            )}
          </AppButton>
          {dropBoxImageId && (
            <AppButton
              onClick={() => setShowCloudDeleteFileModal('Dropbox')}
              onMouseLeave={onMouseLeaveCloudButtonsHandler}
              className={styles.deleteDriveItemBtn}
            >
              <AppSvg size="24px" path="/images/delete-bin.svg" />
            </AppButton>
          )}
        </div>
        {/*
                  <div
                    ref={cloudBtnsRefs[2]}
                    onMouseEnter={() => onMouseEnterCloudButtonsHandler(2)}
                    onMouseLeave={onMouseLeaveCloudButtonsHandler}
                    className={`${styles.cloudProviderButton}`}
                  >
                    <AppButton
                      onClick={() => void 0}
                      twPadding="tw-px-0 tw-py-3"
                      className={styles.appButton}
                      twRounded="tw-rounded-none"
                    >
                      <div className={classNames(styles.svgWrapper, 'tw-flex')}>
                        <AppSvg path="/images/box-logo.svg" size="25px" />
                        <div className={styles.providerText}>Box</div>
                      </div>
                    </AppButton>
                  </div>
                  <div
                    ref={cloudBtnsRefs[3]}
                    onMouseEnter={() => onMouseEnterCloudButtonsHandler(3)}
                    onMouseLeave={onMouseLeaveCloudButtonsHandler}
                    className={`${styles.cloudProviderButton}`}
                  >
                    <AppButton
                      onClick={() => void 0}
                      twPadding="tw-px-0 tw-py-3"
                      className={styles.appButton}
                      twRounded="tw-rounded-none"
                    >
                      <div className={classNames(styles.svgWrapper, 'tw-flex')}>
                        <AppSvg
                          path="/images/Microsoft-OneDrive-logo.svg"
                          size="25px"
                        />
                        <div className={styles.providerText}>OneDrive</div>
                      </div>
                    </AppButton>
                  </div>
                  */}
      </div>
    </Modal>
  );
};

export default SaveToCloudModal;
