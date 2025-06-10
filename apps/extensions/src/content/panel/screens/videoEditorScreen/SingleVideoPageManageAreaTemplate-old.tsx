import React, { useEffect, useMemo, useState } from 'react';
import * as styles from '@/content/panel/screens/videoEditorScreen/VideoEditorScreen.module.scss';
import { IUser } from '@/app/interfaces/IUserData';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import IEditorVideo from '@/app/interfaces/IEditorVideo';
import { DriveUser } from '@/app/services/google/auth';
import useEnableComments from '@/content/panel/hooks/useEnableComments/useEnableComments';
import IExplorerData from '@/app/interfaces/IExplorerData';
import useCloudSaveButtons from '@/content/panel/hooks/useCloudSaveButtons';
import { getFolderByIdAPI } from '@/app/services/api/video';
import { decreaseFolderItems } from '@/app/services/helpers/manageFolders';
import { downloadVideo, moveRestoreVideoTrash } from '@/app/services/videos';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import {
  errorMessage,
  infoMessage,
  successMessage,
} from '@/app/services/helpers/toastMessages';
//@ts-ignore
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import useGetExplorerDataListener from '@/content/panel/screens/imagesScreen/pages/shared/hooks/useGetExplorerDataListener';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import { PlaybackStatusEnum } from '@/app/enums/StreamingServicesEnums';
import { dropboxFileUpload, saveSegmentEvent } from '@/app/services/general';
import { useErrorHandler } from '@/app/services/helpers/errors';
import { IDriveDbData } from '@/app/interfaces/IDriveDbData';
import browser from '@/app/utilities/browser';
import { deleteDriveItem, driveUploadFile } from '@/app/services/google/drive';
import { ResStatusEnum } from '@/app/interfaces/IDataResponse';
import { deleteDropboxItem } from '@/app/services/api/messages';
import { Dropdown, Menu } from 'antd';
import AppSvg from '@/content/components/elements/AppSvg';
import classNames from 'classnames';
import ImageActionsCard from '@/content/panel/screens/singleImageScreen/imageActions/ImageActionsCard';
import ImageActionItem from '@/content/panel/screens/singleImageScreen/imageActions/ImageActionItem';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSpinnerLocal from '@/content/components/containers/appSpinnerLocal/AppSpinnerLocal';
import EmailModal from '@/content/panel/screens/imagesScreen/components/emailModal/EmailModal';
import UploadToCloudModal from '@/content/panel/screens/singleImageScreen/uploadToCloudModal/UploadToCloudModal';
import ItemsFolderModal from '@/content/panel/screens/imagesScreen/components/itemsFolderModal/ItemsFolderModal';
import DeleteDriveFileModal from '@/content/components/shared/DeleteDriveFIleModal';
import DeleteCloudFileModal from '@/content/components/shared/DeleteCloudFileModal';
import { IWorkspace, IWorkspaceVideo } from '@/app/interfaces/IWorkspace';
import { IStreamState } from '@/app/interfaces/IStreamState';
import DeleteItemModal from '../imagesScreen/pages/shared/DeleteItemModal';
import { useWorkspaceVideoDelete } from '@/content/utilities/misc/workspaceFunctions';
import WorkspaceItemsFolderModal from '../imagesScreen/pages/workspace/WorkspaceItemsFolderModal';
import useGenerateShareLink from '@/content/utilities/hooks/useGenerateShareLink';
import useVideoChapters from '../../hooks/useVideoChapters';
import VideoChapters from './chapters/VideoChapters/VideoChapters';
import { Trans, useTranslation } from 'react-i18next';

interface IEmailModal {
  state: boolean;
  video: IEditorVideo | null;
}

interface IProps {
  user: IUser;
  video: IEditorVideo | IWorkspaceVideo;
  streamState: IStreamState | null;
  chaptersEnabled: boolean;
  trimVideoSection: JSX.Element | null;
  workspace?: IWorkspace;
  setVideo: React.Dispatch<
    React.SetStateAction<IEditorVideo | IWorkspaceVideo | null>
  >;
  updateChaptersEnabled: () => void;
  setLoaderState: React.Dispatch<React.SetStateAction<boolean>>;
}

const SingleVideoPageManageAreaTemplate: React.FC<IProps> = ({
  user,
  video,
  streamState,
  chaptersEnabled,
  trimVideoSection,
  workspace,
  setVideo,
  updateChaptersEnabled,
  setLoaderState,
}) => {
  const { errorHandler } = useErrorHandler();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { workspaceVideoDelete } = useWorkspaceVideoDelete();
  const navigate = useNavigate();
  const driveUser: DriveUser | null = useSelector(
    (state: RootStateOrAny) => state.auth.driveUser,
  );
  const [deletionModalState, setDeletionModalState] = useState<{
    state: boolean;
    video: IEditorVideo | null;
  }>({ state: false, video: null });
  const [emailModalState, setEmailModalState] = useState<IEmailModal>({
    state: false,
    video: null,
  });
  const openDeleteModal = (video: IEditorVideo) => {
    setDeletionModalState({
      state: true,
      video,
    });
  };
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [driveVideoId, setDriveVideoId] = useState<string | null>('');
  const [uploadToCloudModalState, setUploadToCloudModalState] =
    useState<boolean>(false);
  const [showDriveDeleteFileModal, setShowDriveDeleteFileModal] =
    useState(false);
  const [driveOperationLoading, setDriveOperationLoading] = useState(false);
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null);
  const [dropBoxImageId, setDropBoxImageId] = useState<string>('');
  const [dropboxOperationLoading, setDropboxOperationLoading] = useState(false);
  const [uploadToCloudType, setUploadToCloudType] = useState<string>('');
  const [showCloudDeleteFileModal, setShowCloudDeleteFileModal] = useState<
    string | null
  >(null);
  const { commentsTemplate, setShowPicker } = useEnableComments({
    itemType: 'video',
    item: video,
    isPublic: false,
    user: user,
  });
  const explorerDataVideos: IExplorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerDataVideos,
  );
  const {
    cloudBtnsRefs,
    onMouseEnterCloudButtonsHandler,
    onMouseLeaveCloudButtonsHandler,
  } = useCloudSaveButtons({
    hiddenClass: styles.hoveredHidden,
    activeClass: styles.hoveredActive,
  });
  const {
    sharedLink,
    copyLinkHandler,
    getShareableLinkHandler,
    deleteShareLink,
  } = useGenerateShareLink(
    video,
    'video',
    workspace?.id || '',
    updateVideoState,
  );
  const [shareLoadingState, setShareLoadingState] = useState(false);
  const {
    chapters,
    chaptersInitial,
    chapterActive,
    hasChanges,
    isSaving,
    chapterActivate,
    chapterAdd,
    chapterUpdate,
    chapterClose,
    saveChanges,
    setHasChangesHandler,
  } = useVideoChapters({ video, workspaceId: workspace?.id });

  async function updateVideoState(updatedVideo: any) {
    dispatch(PanelAC.updateExplorerVideoData({ video: updatedVideo }));
    // dispatch(PanelAC.setEditorVideo({ editorVideo: updatedVideo }));
    setVideo && setVideo(updatedVideo);
  }

  const folderName = video?.dbData?.folderData?.name || t('common.myVideos');
  const currentlySavedIn = useMemo(
    () =>
      workspace
        ? workspace.folders.find((x) => x.id === video?.dbData?.parentId)
            ?.name || workspace.name
        : folderName,
    [video, workspace, folderName],
  );

  const deleteVideoConfirm = async (video: IEditorVideo) => {
    closeDeletionModalHandler();
    setLoaderState(true);

    if (workspace) {
      await workspaceVideoDelete(video, workspace);
      // router.push(preRoutes.media + panelRoutes.workspace + `/${workspace.id}`);
      navigate(`${panelRoutes.workspace.path}?id=${workspace.id}`);
    } else {
      await videoDelete(video);
      navigate(panelRoutes.videos.path);
    }

    setLoaderState(false);
  };

  const videoDelete = async (video: IEditorVideo) => {
    if (video?.dbData?.parentId && typeof video?.dbData?.parentId == 'string') {
      const { data } = await getFolderByIdAPI(video.dbData.parentId);
      if (data) {
        await decreaseFolderItems(data, 'video', 1);
      }
    }

    video && (await moveRestoreVideoTrash(video));

    infoMessage(t('toasts.videoMovedToTrash'));
  };

  const closeDeletionModalHandler = () => {
    setDeletionModalState({
      state: false,
      video: null,
    });
  };

  useGetExplorerDataListener();

  useEffect(() => {
    const currentDriveData = video?.dbData?.drivesData?.find(
      (x) => x.email === driveUser?.email,
    );
    currentDriveData && setDriveVideoId(currentDriveData.driveId);
  }, [video, driveUser]);

  const updateExplorerDataDrive = (drivesData: IDriveDbData[]) => {
    if (video && video.dbData) {
      const updatedVideo = {
        ...video,
        dbData: { ...video.dbData, drivesData: drivesData },
      };
      const explorerDataIndex = explorerDataVideos.files.findIndex(
        (x) => x.dbData?.id === video.dbData?.id,
      );
      const explorerDatFilesCopy = explorerDataVideos.files.slice();
      explorerDatFilesCopy[explorerDataIndex] = updatedVideo;
      dispatch(
        PanelAC.setExplorerDataVideos({
          explorerDataVideos: {
            ...explorerDataVideos,
            files: explorerDatFilesCopy,
          },
        }),
      );
      dispatch(PanelAC.setEditorVideo({ editorVideo: updatedVideo }));
    }
  };

  const openUploadToCloudModal = async () => {
    if (!driveUser) {
      const tab = await browser.tabs.create({
        url: `${process.env.WEBSITE_URL}/auth/google-auth?driveLogin=true`,
      });

      setTab(tab);
    } else {
      setUploadToCloudModalState(true);
    }
  };
  const closeUploadToCloudModal = () => {
    setUploadToCloudModalState(false);
  };

  const uploadToCloudHandler = async (name: string, type?: string) => {
    if (!video) return;
    closeUploadToCloudModal();
    let res: any;
    if (video.dbData?.streamData) {
      const canDownload =
        streamState?.downloadStatus === PlaybackStatusEnum.READY;
      if (!canDownload) {
        infoMessage(t('toasts.uploading'));
        return;
      }
      res = await fetch(video.dbData.streamData.downloadUrl);
    } else {
      res = await fetch(video.url);
    }

    if (!type) {
      setDriveOperationLoading(true);
      const { data } = await driveUploadFile(
        name,
        await res.blob(),
        video.dbData?.id,
        'video',
      );
      if (data) {
        updateExplorerDataDrive(data.drivesData);
        setDriveVideoId(data.fileId);
        successMessage(t('toasts.videoUploadedSuccess'));
      }
      setDriveOperationLoading(false);
    } else {
      setDropboxOperationLoading(true);
      const response = await dropboxFileUpload(
        name,
        await res.blob(),
        video.dbData?.id,
        'video',
      );
      if (response.status == ResStatusEnum.success) {
        setDropBoxImageId(response.data);
        successMessage(t('toasts.imageUploadedSuccessfully'));
      } else {
        errorMessage(response.message || t('toasts.problemTryAgain'));
      }
      setDropboxOperationLoading(false);
    }
  };

  const deleteDriveVideoConfirm = async () => {
    setShowDriveDeleteFileModal(false);
    setDriveOperationLoading(true);
    if (video?.dbData?.id) {
      const response = await deleteDriveItem(video.dbData?.id, 'video');

      if (response.status === ResStatusEnum.error) {
        setDriveOperationLoading(false);
        errorHandler(response);
      } else {
        updateExplorerDataDrive(response.data);
        setDriveVideoId(null);
        setDriveOperationLoading(false);
        successMessage(t('toasts.fileDeletedFromDrive'));
      }
    }
  };

  const deleteCloudItemConfirm = async () => {
    setShowCloudDeleteFileModal(null);
    if (showCloudDeleteFileModal == 'Dropbox') {
      setDropboxOperationLoading(true);
      const response = await deleteDropboxItem(video?.dbData?.id, 'video');
      if (response.status === ResStatusEnum.error) {
        setDropboxOperationLoading(false);
        errorHandler(response);
      } else {
        setDropBoxImageId('');
        setDropboxOperationLoading(false);
        successMessage(t('toasts.fileDeletedFromDropbox'));
      }
    }
  };

  const openVideOnDropBox = async () => {
    if (window && dropBoxImageId != null) {
      const sourceUrl = `https://www.dropbox.com/home/Apps/Rec?preview=${dropBoxImageId}`;
      window.open(sourceUrl, '_blank');
      saveSegmentEvent('Opened dropbox Image', { title: video?.dbData?.title });
    }
  };

  const openUploadToDropBoxCloudModal = async (type: string) => {
    if (user?.dropbox?.isDropBoxIntegrated) {
      setUploadToCloudType(type);
      setUploadToCloudModalState(true);
    } else {
      navigate(panelRoutes.integrations.path);
    }
  };

  const openVideoOnDrive = async () => {
    driveVideoId &&
      browser.tabs.create({
        url: `https://drive.google.com/file/d/${driveVideoId}/view`,
      });
  };

  const localSave = async () => {
    if (!video) return infoMessage(t('toasts.downloadReady'));

    if (streamState?.downloadStatus === PlaybackStatusEnum.PREPARING)
      return infoMessage(t('toasts.downloadReady'));

    const downloaded = await downloadVideo(video);
    if (downloaded) successMessage(t('toasts.videoDownloaded'));
  };

  const openEmailModal = (video: IEditorVideo) => {
    setEmailModalState({
      state: true,
      video,
    });
  };

  const closeEmailModal = () => {
    setEmailModalState({
      state: false,
      video: null,
    });
  };

  const moreMenu = (
    <Menu>
      <Menu.Item
        icon={<AppSvg size="18px" path="images/panel/common/trash.svg" />}
        onClick={() => openDeleteModal(video)}
        key="menu_item_delete"
      >
        <span className="tw-text-xs">{t('unique.deleteVideo')}</span>
      </Menu.Item>
      <Menu.Item
        icon={<AppSvg size="18px" path="images/panel/common/collection.svg" />}
        onClick={() => updateChaptersEnabled()}
        key="menu_item_chapters_enabled"
      >
        <span className="tw-text-xs">
          {t('page.video.actionsSection.chaptersToggle', {
            action: chaptersEnabled
              ? t('page.video.actionsSection.disable')
              : t('page.video.actionsSection.enable'),
          })}{' '}
        </span>
      </Menu.Item>
    </Menu>
  );

  const IoMdDownload = (): JSX.Element => (
    <AppSvg path="images/panel/common/file_download.svg" size="23px" />
  );
  // const RiImageEditLine = (): JSX.Element => (
  //   <AppSvg path="images/panel/common/trimfilm.svg" />
  // );
  const FiMoreHorizontal = (): JSX.Element => (
    <AppSvg path="images/panel/common/more_horiz.svg" />
  );
  const BiMailSend = (): JSX.Element => (
    <AppSvg
      path="images/panel/common/sendemail.svg"
      size="24px"
      className="tw-text-primary-purple"
    />
  );

  const hideEmojis = async () => {
    setShowPicker(false);
  };

  const generateShareableLink = async () => {
    setShareLoadingState(true);
    await getShareableLinkHandler();
    setShareLoadingState(false);
  };

  const removeSharedLink = async () => {
    setShareLoadingState(true);
    await deleteShareLink();
    setShareLoadingState(false);
  };

  const tabClassesTw =
    'tw-flex tw-justify-center tw-items-center tw-w-1/3 tw-h-50px tw-cursor-pointer tw-outline-none';

  return (
    <>
      <div className="tw-bg-blue-grey tw-rounded-2lg tw-py-0 tw-px-0 tw-shadow-md">
        <Tabs selectedTabClassName="react-tabs__tab--selected tw-text-primary-purple tw-font-bold">
          <TabList className="tw-flex tw-mb-0">
            <Tab className={tabClassesTw} onClick={hideEmojis}>
              <div className={styles.iconContainer}>
                <AppSvg
                  path="images/panel/common/icon-Manage-light.svg"
                  size={25 + 'px'}
                />
              </div>
              <div>{t('common.manage')}</div>
            </Tab>
            <Tab className={tabClassesTw}>
              <div className={styles.iconContainer}>
                <AppSvg
                  path="images/panel/common/collection.svg"
                  size="22px"
                  bgColor="#5b4dbe"
                />
              </div>
              <div className="tw-flex tw-gap-1">
                <span>{t('page.video.actionsSection.chapters')}</span>
                {hasChanges && (
                  <AppSvg
                    path="images/panel/common/circle-solid.svg"
                    size="10px"
                    bgColor="#5b4dbe"
                  />
                )}
              </div>
            </Tab>
            <Tab className={tabClassesTw}>
              <div className={styles.iconContainer}>
                <AppSvg
                  path="images/panel/common/comments.svg"
                  size={25 + 'px'}
                />
              </div>
              <div>{t('common.comments')}</div>
            </Tab>
          </TabList>
          <TabPanel>
            <ImageActionsCard className="tw-rounded-t-none">
              <div>
                <Trans
                  values={{ currentlySavedIn: currentlySavedIn }}
                  i18nKey="page.image.currentlySavedInOnly"
                  components={{
                    strong: <strong></strong>,
                  }}
                />
              </div>
              <div
                className={styles.moveToFolder}
                onClick={() => setShowFolderModal(true)}
              >
                <div className={styles.moveToFolderInner}>
                  <div>{t('page.image.moveToFolder')}</div>
                  <AppSvg
                    size="24px"
                    path="images/panel/common/arrow-right.svg"
                    className="tw-ml-4"
                  />
                </div>
              </div>
            </ImageActionsCard>
            <ImageActionsCard>
              <div className="tw-grid tw-gap-4 tw-grid-cols-3 tw-justify-items-center across-btns:tw-gap-1 across-btns:tw-grid-rows-1 across-btns:tw-place-items-center">
                <ImageActionItem
                  title={t('common.download')}
                  onClick={localSave}
                  icon={IoMdDownload}
                  outerClassName={styles.containerVideoAction}
                  circleClassName={styles.innerCircle}
                  iconColor="#5B4DBE"
                />
                <ImageActionItem
                  title={t('page.image.email')}
                  icon={BiMailSend}
                  onClick={() => openEmailModal(video)}
                  outerClassName={styles.containerVideoAction}
                  circleClassName={styles.innerCircle}
                  iconColor="#5B4DBE"
                  //additionalClass={true}
                />
                <Dropdown
                  trigger={['click']}
                  overlay={moreMenu}
                  placement="bottomLeft"
                >
                  <ImageActionItem
                    title={t('common.more')}
                    icon={FiMoreHorizontal}
                    outerClassName={styles.containerVideoAction}
                    circleClassName={styles.innerCircle}
                    iconColor="#5B4DBE"
                  />
                </Dropdown>
              </div>
            </ImageActionsCard>
            {trimVideoSection}
            <ImageActionsCard>
              {sharedLink ? (
                <div>
                  <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
                    <div className="tw-font-semibold tw-text-sm tw-text-center">
                      {t('page.image.shareableLink')}
                    </div>
                    <AppButton
                      onClick={removeSharedLink}
                      bgColor="tw-bg-red"
                      className="tw-pt-0 tw-pb-0 tw-pl-2 tw-pr-2"
                    >
                      <span className="tw-text-xs tw-text-white">
                        {t('page.image.remove')}
                      </span>
                    </AppButton>
                  </div>

                  <div className="tw-text-xs tw-mb-3 tw-break-words">
                    {sharedLink}
                  </div>

                  <AppButton
                    onClick={copyLinkHandler}
                    full
                    className={styles.generateLink}
                  >
                    {shareLoadingState ? (
                      <div className={styles.localAppSpinnerWrapper}>
                        <AppSpinnerLocal />
                      </div>
                    ) : (
                      <>
                        <AppSvg
                          path="images/panel/common/copy.svg"
                          size={25 + 'px'}
                          className="tw-mr-2"
                        />
                        {t('page.image.copy')}
                      </>
                    )}
                  </AppButton>
                </div>
              ) : (
                <div>
                  <div className="tw-font-semibold tw-text-sm tw-mb-2 tw-text-center">
                    {t('page.image.shareYourVideo')}
                  </div>
                  <AppButton
                    onClick={generateShareableLink}
                    full
                    className={styles.generateLink}
                  >
                    {shareLoadingState ? (
                      <div className={styles.localAppSpinnerWrapper}>
                        <AppSpinnerLocal />
                      </div>
                    ) : (
                      t('page.image.generateShareableLink')
                    )}
                  </AppButton>
                </div>
              )}
            </ImageActionsCard>
            <ImageActionsCard>
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
                          {t('page.image.processing')}{' '}
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
                        <AppSvg
                          path="images/panel/common/google-drive-logo.svg"
                          size="25px"
                        />
                        <div className={styles.providerText}>
                          {driveVideoId && driveUser ? (
                            <div className={styles.openVideoText}>
                              {t('page.image.openVideo')}
                            </div>
                          ) : (
                            driveUser?.email || 'Google Drive'
                          )}
                        </div>
                      </div>
                    </AppButton>
                  )}
                  {driveVideoId && (
                    <AppButton
                      onMouseLeave={onMouseEnterCloudButtonsHandler}
                      onClick={() => setShowDriveDeleteFileModal(true)}
                      className={styles.deleteDriveItemBtn}
                    >
                      <AppSvg
                        path="images/panel/common/delete-bin.svg"
                        size="24px"
                      />
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
                        ? openVideOnDropBox()
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
                        <AppSvg
                          path="/images/panel/common/dropbox-icon.svg"
                          size="25px"
                        />
                        <div className={styles.providerText}>
                          {dropBoxImageId
                            ? t('page.image.openImage')
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
                      <AppSvg
                        size="24px"
                        path="/images/panel/common/delete-bin.svg"
                      />
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
                      <AppSvg
                        path="images/panel/common/box-logo.svg"
                        size="25px"
                      />
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
                        path="images/panel/common/Microsoft-OneDrive-logo.svg"
                        size="25px"
                      />
                      <div className={styles.providerText}>OneDrive</div>
                    </div>
                  </AppButton>
                </div>
                 */}
              </div>
            </ImageActionsCard>
          </TabPanel>
          <TabPanel
            className="tw-bg-white tw-flex tw-flex-col tw-justify-between tw-rounded-b-md tw-rounded-tl-md tw-scrollbar-thin tw-scrollbar-thumb-gray-400 tw-scrollbar-track-gray-100 tw-scrollbar-thumb-rounded-full tw-scrollbar-track-rounded-full tw-relative"
            selectedClassName="react-tabs__tab-panel--selected tw-min-h-500px tw-max-h-1000px tw-overflow-y-auto tw-p-5 tw-h-665px"
          >
            <VideoChapters
              chapters={chapters}
              chaptersInitial={chaptersInitial}
              chapterActive={chapterActive}
              hasChanges={hasChanges}
              isSaving={isSaving}
              chaptersEnabled={chaptersEnabled}
              chapterActivate={chapterActivate}
              chapterAdd={chapterAdd}
              chapterUpdate={chapterUpdate}
              chapterClose={chapterClose}
              saveChanges={saveChanges}
              setHasChangesHandler={setHasChangesHandler}
            />
          </TabPanel>
          <TabPanel
            className="tw-bg-white tw-flex tw-flex-col tw-justify-between tw-rounded-b-md tw-rounded-tl-md"
            selectedClassName="react-tabs__tab-panel--selected tw-min-h-500px tw-max-h-1000px tw-overflow-y-auto tw-p-5"
          >
            {commentsTemplate}
          </TabPanel>
        </Tabs>
      </div>

      <DeleteItemModal
        visible={deletionModalState.state}
        item={deletionModalState.video}
        itemType="video"
        onOk={deleteVideoConfirm}
        onCancel={closeDeletionModalHandler}
      />
      <EmailModal
        visible={emailModalState.state}
        item={emailModalState.video}
        onCancel={closeEmailModal}
        itemType={'video'}
        itemPublicLink={video?.url || ''}
      />
      <UploadToCloudModal
        type={uploadToCloudType}
        oldName={video?.dbData?.title}
        visible={uploadToCloudModalState}
        onClose={closeUploadToCloudModal}
        onOk={uploadToCloudHandler}
      />
      {!workspace && video && (
        <ItemsFolderModal
          visible={showFolderModal}
          mainItem={video}
          onCancel={() => setShowFolderModal(false)}
          type={'video'}
          loader={setLoaderState}
        />
      )}
      {workspace && video && (
        <WorkspaceItemsFolderModal
          visible={showFolderModal}
          items={[video as IWorkspaceVideo]}
          onCancel={() => setShowFolderModal(false)}
          updateSingleItem={setVideo}
        />
      )}
      <DeleteDriveFileModal
        visible={showDriveDeleteFileModal}
        onOk={deleteDriveVideoConfirm}
        onCancel={() => setShowDriveDeleteFileModal(false)}
      />
      {!!showCloudDeleteFileModal && (
        <DeleteCloudFileModal
          visible={true}
          type={showCloudDeleteFileModal}
          onOk={deleteCloudItemConfirm}
          onCancel={() => setShowCloudDeleteFileModal(null)}
        />
      )}
    </>
  );
};

export default SingleVideoPageManageAreaTemplate;
