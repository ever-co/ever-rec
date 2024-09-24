import useAuthenticateUser from '../../../hooks/useAuthenticateUser';
import { useRouter } from 'next/router';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import IEditorVideo from '../../../app/interfaces/IEditorVideo';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DriveUser } from '../../../app/services/google/auth';
import useEnableComments from '../../../hooks/useEnableComments/useEnableComments';
import useGoogleDriveAuth from '../../../hooks/useGoogleDriveAuth';
import IExplorerData from '../../../app/interfaces/IExplorerData';
import useCloudSaveButtons from '../../../hooks/useCloudSaveButtons';
import styles from '../../../pagesScss/video/Video.module.scss';
import { getFolderByIdAPI } from '../../../app/services/api/video';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { decreaseFolderItems } from '../../../app/services/helpers/manageFolders';
import {
  downloadVideo,
  moveRestoreVideoTrash,
} from '../../../app/services/videos';
import { panelRoutes, preRoutes } from '../../_routes';
import {
  errorMessage,
  infoMessage,
  successMessage,
} from '../../../app/services/helpers/toastMessages';
import { IDriveDbData } from '../../../app/interfaces/IDriveDbData';
import PanelAC from '../../../app/store/panel/actions/PanelAC';
import {
  deleteDriveItem,
  driveUploadFile,
} from '../../../app/services/google/drive';
import { ResStatusEnum } from '../../../app/interfaces/IApiResponse';
import { errorHandler } from '../../../app/services/helpers/errors';
import { deleteDropboxItem } from '../../../app/services/api/messages';
import { PlaybackStatusEnum } from '../../../app/enums/StreamingServicesEnums';
import {
  dropboxFileUpload,
  saveSegmentEvent,
} from '../../../app/services/general';
import AppSvg from '../../elements/AppSvg';
import { Dropdown, Menu } from 'antd';
import classNames from 'classnames';
import ImageActionsCard from '../_singleImageScreen/imageActions/ImageActionsCard';
import ImageActionItem from '../_singleImageScreen/imageActions/ImageActionItem';
import AppButton from '../../controls/AppButton';
import { IoCopyOutline } from 'react-icons/io5';
import AppSpinnerLocal from '../../containers/appSpinnerLocal/AppSpinnerLocal';
import EmailModal from '../../elements/EmailModal';
import UploadToCloudModal from '../_singleImageScreen/uploadToCloudModal/UploadToCloudModal';
import DeleteCloudFileModal from '../../shared/DeleteCloudFileModal';
import ItemsFolderModal from '../_imagesScreen/components/itemsFolderModal/ItemsFolderModal';
import { IStreamState } from '../../../app/interfaces/IStreamState';
import {
  IWorkspace,
  IWorkspaceVideo,
} from '../../../app/interfaces/IWorkspace';
import WorkspaceItemsFolderModal from '../_imagesScreen/components/itemsFolderModal/WorkspaceItemsFolderModal';
import DeleteItemModal from 'components/shared/DeleteItemModal';
import { workspaceVideoDelete } from 'misc/workspaceFunctions';
import useGenerateShareLink from 'hooks/useGenerateShareLink';
import VideoChapters from 'components/pagesComponents/_videoEditorScreen/chapters/VideoChapters/VideoChapters';
import useVideoChapters from 'hooks/useVideoChapters';

const tabClassesTw =
  'tw-flex tw-justify-center tw-items-center tw-w-1/3 tw-h-50px tw-cursor-pointer tw-outline-none';

interface IEmailModalProps {
  state: boolean;
  video: IEditorVideo | null;
}

interface IProps {
  video: IWorkspaceVideo | IEditorVideo;
  streamState: IStreamState;
  chaptersEnabled: boolean;
  workspace?: IWorkspace;
  setVideo?: React.Dispatch<React.SetStateAction<IWorkspaceVideo>>;
  updateChaptersEnabled: () => void;
  setLoaderState: React.Dispatch<React.SetStateAction<boolean>>;
}

const SingleVideoPageManageAreaTemplate: React.FC<IProps> = ({
  video,
  streamState,
  chaptersEnabled,
  workspace,
  setVideo,
  updateChaptersEnabled,
  setLoaderState,
}) => {
  const user = useAuthenticateUser();
  const router = useRouter();
  const dispatch = useDispatch();
  const [dropBoxImageId, setDropBoxImageId] = useState<string | null>('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const driveUser: DriveUser | null = useSelector(
    (state: RootStateOrAny) => state.auth.driveUser,
  );
  const [deletionModalState, setDeletionModalState] = useState<{
    state: boolean;
    video: IEditorVideo | null;
  }>({ state: false, video: null });
  const [emailModalState, setEmailModalState] = useState<IEmailModalProps>({
    state: false,
    video: null,
  });
  const openDeleteModal = (video: IEditorVideo) => {
    setDeletionModalState({
      state: true,
      video,
    });
  };
  const { commentsTemplate, setShowPicker } = useEnableComments({
    itemType: 'video',
    item: video,
    isPublic: false,
    user,
  });
  const [driveVideoId, setDriveVideoId] = useState<string | null>('');
  const [uploadToCloudModalState, setUploadToCloudModalState] =
    useState<boolean>(false);
  const [showCloudDeleteFileModal, setShowCloudDeleteFileModal] = useState<
    string | null
  >(null);
  const [driveOperationLoading, setDriveOperationLoading] = useState(false);
  const [dropboxOperationLoading, setDropboxOperationLoading] = useState(false);
  const { driveLogin } = useGoogleDriveAuth({
    pathname: router.query?.id ? `/video/${router.query?.id}` : '/media/videos',
  });
  const explorerDataVideos: IExplorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerDataVideos,
  );
  const [uploadToCloudType, setUploadToCloudType] = useState<string | null>(
    null,
  );
  const {
    cloudBtnsRefs,
    onMouseEnterCloudButtonsHandler,
    onMouseLeaveCloudButtonsHandler,
  } = useCloudSaveButtons({
    hiddenClass: styles.hoveredHidden,
    activeClass: styles.hoveredActive,
  });
  const folderName = video?.dbData?.folderData?.name || 'My Videos';
  const currentlySavedIn = useMemo(
    () =>
      workspace
        ? workspace.folders.find((x) => x.id === video?.dbData?.parentId)
            ?.name || workspace.name
        : folderName,
    [video, workspace, folderName],
  );
  const {
    sharedLink,
    copyLinkHandler,
    getShareableLinkHandler,
    deleteShareLink,
  } = useGenerateShareLink(
    video,
    'video',
    workspace?.id as string,
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
    dispatch(PanelAC.setEditorVideo({ editorVideo: updatedVideo }));
    setVideo && setVideo(updatedVideo);
  }

  const deleteVideoConfirm = async (video: IEditorVideo | null) => {
    closeDeletionModalHandler();
    setLoaderState(true);

    if (workspace) {
      await workspaceVideoDelete(video as IWorkspaceVideo, workspace);
      router.push(preRoutes.media + panelRoutes.workspace + `/${workspace.id}`);
    } else {
      await videoDelete(video as IEditorVideo);
      router.push(preRoutes.media + panelRoutes.videos);
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

    infoMessage('The video has been moved to the trash');
  };

  const closeDeletionModalHandler = () => {
    setDeletionModalState({
      state: false,
      video: null,
    });
  };

  //-------> start of drive
  const updateExplorerDataDrive = (drivesData: IDriveDbData[]) => {
    const updatedVideo = {
      ...video,
      dbData: { ...video.dbData, drivesData: drivesData },
    };
    const explorerDataIndex = explorerDataVideos.files.findIndex(
      (x) => x.dbData?.id === video.dbData?.id,
    );
    const explorerDatFilesCopy = explorerDataVideos.files.slice();
    explorerDatFilesCopy[explorerDataIndex] = updatedVideo as any;
    dispatch(
      PanelAC.setExplorerDataVideos({
        explorerDataVideos: {
          ...explorerDataVideos,
          files: explorerDatFilesCopy,
        },
      }),
    );
    dispatch(PanelAC.setEditorVideo({ editorVideo: updatedVideo as any }));
  };

  const deleteDriveVideoConfirm = async () => {
    setShowCloudDeleteFileModal(null);
    if (showCloudDeleteFileModal == 'drive') {
      setDriveOperationLoading(true);
      const response = await deleteDriveItem(
        video.dbData?.id as string,
        'video',
      );

      if (response.status === ResStatusEnum.error) {
        console.log(response.message);
        setDriveOperationLoading(false);
        errorHandler(response);
      } else {
        updateExplorerDataDrive(response.data);
        setDriveVideoId(null);
        setDriveOperationLoading(false);
        successMessage('File deleted from drive');
      }
    }
    if (showCloudDeleteFileModal == 'Dropbox') {
      setDropboxOperationLoading(true);
      const response = await deleteDropboxItem(
        video.dbData?.id as string,
        'video',
      );
      if (response.status === ResStatusEnum.error) {
        console.log(response.message);
        setDropboxOperationLoading(false);
        errorHandler(response);
      } else {
        setDropBoxImageId(null);
        setDropboxOperationLoading(false);
        successMessage('File deleted from Dropbox');
      }
    }
  };

  const uploadToCloudHandler = async (name: string, type?: string) => {
    closeUploadToCloudModal();
    let res: any;
    res = await fetch(video.url as string);
    if (!type) {
      setDriveOperationLoading(true);
      if (video.dbData?.streamData) {
        const canDownload =
          streamState.downloadStatus === PlaybackStatusEnum.READY;
        if (!canDownload) {
          setDriveOperationLoading(false);
          infoMessage('You will be able to upload to drive shortly...');
          return;
        }

        res = await fetch(video.dbData.streamData.downloadUrl);
      } else {
        res = await fetch(video.url as string);
      }

      const { data } = await driveUploadFile(
        name,
        await res.blob(),
        video.dbData?.id as string,
        'video',
      );
      if (data) {
        updateExplorerDataDrive(data.drivesData);
        setDriveVideoId(data.fileId);
        successMessage('Video uploaded successfully.');
        await saveSegmentEvent('Video uploaded to google drive', {
          title: video.dbData?.title,
        });
      }
      setDriveOperationLoading(false);
    } else {
      setDropboxOperationLoading(true);
      const response = await dropboxFileUpload(
        name,
        await res.blob(),
        video.dbData?.id as string,
        'video',
      );
      if (response.status == 'success') {
        setDropBoxImageId(response.data);
        successMessage('Video uploaded successfully.');
        setDropboxOperationLoading(false);
      } else {
        setDropboxOperationLoading(false);
        errorMessage(
          response.message || 'Something went wrong, Please try again later',
        );
      }
      setLoaderState(false);
    }
  };

  const openVideoOnDrive = async () => {
    driveVideoId &&
      driveUser &&
      window &&
      window
        .open(`https://drive.google.com/file/d/${driveVideoId}/view`, '_blank')
        ?.focus();
  };

  //-------> end of drive

  useEffect(() => {
    const currentDriveData = video?.dbData?.drivesData?.find(
      (x) => x.email === driveUser?.email,
    );
    currentDriveData && setDriveVideoId(currentDriveData.driveId);
    if (video?.dbData?.dropBoxData) {
      setDropBoxImageId(video?.dbData?.dropBoxData?.name);
    }
  }, [video, driveUser]);

  const localSave = async () => {
    if (streamState?.downloadStatus === PlaybackStatusEnum.PREPARING)
      return infoMessage('Your download will be ready shortly...');

    const downloaded = await downloadVideo(video);

    if (downloaded) {
      successMessage('Video downloaded!');
      await saveSegmentEvent('Video Downloaded', {
        title: video.dbData?.title,
      });
    }
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
        icon={<AppSvg size="18px" path="/images/trash.svg" />}
        onClick={() => openDeleteModal(video)}
        key="menu_item_delete"
      >
        <span className="tw-text-xs">Delete Video</span>
      </Menu.Item>
      <Menu.Item
        icon={<AppSvg size="18px" path="/common/collection.svg" />}
        onClick={() => updateChaptersEnabled()}
        key="menu_item_chapters_enabled"
      >
        <span className="tw-text-xs">
          {chaptersEnabled ? 'Disable' : 'Enable'} Chapters
        </span>
      </Menu.Item>
    </Menu>
  );

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

  const closeUploadToCloudModal = () => {
    setUploadToCloudType(null);
    setUploadToCloudModalState(false);
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

  return (
    <>
      <div className="tw-bg-blue-grey tw-rounded-2lg mx-xl:tw-px-0 tw-py-0 tw-px-0 tw-shadow-md ">
        <Tabs selectedTabClassName="react-tabs__tab--selected tw-text-primary-purple tw-font-bold">
          <TabList className="tw-flex tw-mb-0 ">
            <Tab
              className={tabClassesTw}
              onClick={() => {
                hideEmojis();
                hasChanges && saveChanges(false);
              }}
            >
              <div className={styles.iconContainer}>
                <AppSvg path="/images/icon-Manage-light.svg" size="25px" />
              </div>
              <div>Manage</div>
            </Tab>
            <Tab className={tabClassesTw}>
              <div className={styles.iconContainer}>
                <AppSvg
                  path="/common/collection.svg"
                  size="22px"
                  bgColor="#5b4dbe"
                />
              </div>
              <div className="tw-flex tw-gap-1">
                <span>Chapters</span>
                {hasChanges && (
                  <AppSvg
                    path="/common/circle-solid.svg"
                    size="10px"
                    bgColor="#5b4dbe"
                  />
                )}
              </div>
            </Tab>
            <Tab
              className={tabClassesTw}
              onClick={() => hasChanges && saveChanges(false)}
            >
              <div className={styles.iconContainer}>
                <AppSvg path="/images/comments.svg" size="25px" />
              </div>
              <div>Comments</div>
            </Tab>
          </TabList>
          <TabPanel>
            <ImageActionsCard className="tw-rounded-t-none">
              <div>
                Currently saved in
                <strong className="tw-ml-1.5">{currentlySavedIn}</strong>
              </div>
              <div
                className={styles.moveToFolder}
                onClick={() => setShowFolderModal(true)}
              >
                <div className={styles.moveToFolderInner}>
                  <div>Move to folder</div>
                  <AppSvg
                    size="24px"
                    path="/images/right-arrow.svg"
                    className="tw-ml-4"
                  />
                </div>
              </div>
            </ImageActionsCard>
            <ImageActionsCard>
              <div className="tw-grid tw-gap-4 tw-grid-cols-3 tw-justify-items-center across-btns:tw-gap-1 across-btns:tw-grid-rows-1 across-btns:tw-place-items-center">
                <ImageActionItem
                  title="Download"
                  onClick={localSave}
                  icon={IoMdDownload}
                  outerClassName={styles.containerVideoAction}
                  circleClassName={styles.innerCircle}
                  iconColor="#5B4DBE"
                />
                <ImageActionItem
                  title="Email"
                  icon={BiMailSend}
                  onClick={() => openEmailModal(video)}
                  outerClassName={styles.containerVideoAction}
                  circleClassName={styles.innerCircle}
                  iconColor="#5B4DBE"
                />
                <Dropdown
                  trigger={['click']}
                  overlay={moreMenu}
                  placement="bottomLeft"
                >
                  <ImageActionItem
                    title="More"
                    icon={FiMoreHorizontal}
                    outerClassName={styles.containerVideoAction}
                    circleClassName={styles.innerCircle}
                    iconColor="#5B4DBE"
                  />
                </Dropdown>
              </div>
            </ImageActionsCard>

            <ImageActionsCard>
              {sharedLink ? (
                <div>
                  <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
                    <div className="tw-font-semibold tw-text-sm tw-text-center">
                      Shareable link:
                    </div>
                    <AppButton
                      onClick={removeSharedLink}
                      bgColor="tw-bg-red"
                      className="tw-pt-0 tw-pb-0 tw-pl-2 tw-pr-2"
                    >
                      <span className="tw-text-xs tw-text-white">Remove</span>
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
                        <IoCopyOutline size={25} className="tw-mr-2" />
                        Copy
                      </>
                    )}
                  </AppButton>
                </div>
              ) : (
                <div>
                  <div className="tw-font-semibold tw-text-sm tw-mb-2 tw-text-center">
                    Share Your Video
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
                      'Generate Shareable Link'
                    )}
                  </AppButton>
                </div>
              )}
            </ImageActionsCard>

            {!workspace && (
              <ImageActionsCard>
                <div className="tw-font-semibold tw-text-sm tw-mb-2 tw-text-center">
                  Save to Cloud
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
                            Processing...
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
                        <div
                          className={classNames(styles.svgWrapper, 'tw-flex')}
                        >
                          <AppSvg
                            path="/images/google-drive-logo.svg"
                            size="25px"
                          />
                          <div className={styles.providerText}>
                            {driveVideoId && driveUser ? (
                              <div className={styles.openVideoText}>
                                Open video
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
                              Processing...
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={classNames(styles.svgWrapper, 'tw-flex')}
                        >
                          <AppSvg path="/images/dropbox-logo.svg" size="25px" />
                          <div className={styles.providerText}>
                            {dropBoxImageId
                              ? 'Open Video'
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
              </ImageActionsCard>
            )}
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
            className="tw-bg-white tw-flex tw-flex-col tw-justify-between tw-rounded-b-md tw-rounded-tl-md tw-scrollbar-thin tw-scrollbar-thumb-gray-400 tw-scrollbar-track-gray-100 tw-scrollbar-thumb-rounded-full tw-scrollbar-track-rounded-full"
            selectedClassName="react-tabs__tab-panel--selected tw-min-h-500px tw-max-h-1000px tw-overflow-y-auto tw-p-5"
          >
            {' '}
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
        itemPublicLink={video?.url as string}
      />
      <UploadToCloudModal
        type={uploadToCloudType as string}
        oldName={video?.dbData?.title}
        visible={uploadToCloudModalState}
        onClose={closeUploadToCloudModal}
        onOk={uploadToCloudHandler}
      />
      {!!showCloudDeleteFileModal && (
        <DeleteCloudFileModal
          visible={true}
          type="Dropbox"
          onOk={deleteDriveVideoConfirm}
          onCancel={() => setShowCloudDeleteFileModal(null)}
        />
      )}
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
          setVisible={setShowFolderModal}
          updateSingleItem={setVideo}
          setLoading={setLoaderState}
        />
      )}
    </>
  );
};

export default SingleVideoPageManageAreaTemplate;

const IoMdDownload = (): JSX.Element => (
  <AppSvg path="/images/file_download.svg" size="23px" />
);

const FiMoreHorizontal = (): JSX.Element => (
  <AppSvg path="/images/more_horiz.svg" />
);

const BiMailSend = (): JSX.Element => (
  <AppSvg
    path="/images/sendemail.svg"
    size="24px"
    className="tw-text-primary-purple"
  />
);
