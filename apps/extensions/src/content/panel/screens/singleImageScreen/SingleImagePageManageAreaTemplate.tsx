import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as styles from '@/content/panel/screens/singleImageScreen/SingleImageScreen.module.scss';
import browser from '@/app/utilities/browser';
import { useNavigate } from 'react-router-dom';
import AuthAC from '@/app/store/auth/actions/AuthAC';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { IUser } from '@/app/interfaces/IUserData';
import IEditorImage from '@/app/interfaces/IEditorImage';
import useEnableComments from '@/content/panel/hooks/useEnableComments/useEnableComments';
import { DriveUser } from '@/app/services/google/auth';
import IExplorerData from '@/app/interfaces/IExplorerData';
import useCloudSaveButtons from '@/content/panel/hooks/useCloudSaveButtons';
import { IAppMessage } from '@/app/messagess';
import { IDriveDbData } from '@/app/interfaces/IDriveDbData';
import { deleteDriveItem, driveUploadFile } from '@/app/services/google/drive';
import { ResStatusEnum } from '@/app/interfaces/IDataResponse';
import { useErrorHandler } from '@/app/services/helpers/errors';
import {
  errorMessage,
  infoMessage,
  successMessage,
} from '@/app/services/helpers/toastMessages';
import { dropboxFileUpload, saveSegmentEvent } from '@/app/services/general';
import { getFolderByIdAPI } from '@/app/services/api/image';
import { decreaseFolderItems } from '@/app/services/helpers/manageFolders';
import { moveRestoreTrash } from '@/app/services/screenshots';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import { getBlobfromUrl, localSave } from '@/app/utilities/images';
import { saveAs } from 'file-saver';
import { ClipboardItemInterface } from 'clipboard-polyfill/dist/overwrite-globals/ClipboardItem/spec';
import { deleteDropboxItem } from '@/app/services/api/messages';
import { Dropdown, Menu } from 'antd';
import AppSvg from '@/content/components/elements/AppSvg';
import ImageActionsCard from '@/content/panel/screens/singleImageScreen/imageActions/ImageActionsCard';
import ImageActionItem from '@/content/panel/screens/singleImageScreen/imageActions/ImageActionItem';
import AppButton from '@/content/components/controls/appButton/AppButton';
import classNames from 'classnames';
import AppSpinnerLocal from '@/content/components/containers/appSpinnerLocal/AppSpinnerLocal';
import { IWorkspace, IWorkspaceImage } from '@/app/interfaces/IWorkspace';
//@ts-ignore
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import UploadToCloudModal from './uploadToCloudModal/UploadToCloudModal';
import DeleteDriveFileModal from '@/content/components/shared/DeleteDriveFIleModal';
import EmailModal from '../imagesScreen/components/emailModal/EmailModal';
import ItemsFolderModal from '../imagesScreen/components/itemsFolderModal/ItemsFolderModal';
import DeleteCloudFileModal from '@/content/components/shared/DeleteCloudFileModal';
import WorkspaceItemsFolderModal from '../imagesScreen/pages/workspace/WorkspaceItemsFolderModal';
import DeleteItemModal from '../imagesScreen/pages/shared/DeleteItemModal';
import { useWorkspaceImageDelete } from '@/content/utilities/misc/workspaceFunctions';
import useGenerateShareLink from '@/content/utilities/hooks/useGenerateShareLink';
import { pdfFromImageUrl } from '@/app/utilities/pdfFromImageUrl';
import { useTranslation } from 'react-i18next';

interface IDeletionModal {
  state: boolean;
  screenshot: IEditorImage | null;
}

interface IEmailModal {
  state: boolean;
  screenshot: IEditorImage | null;
}

interface Props {
  image: IEditorImage | IWorkspaceImage;
  setImage?: React.Dispatch<React.SetStateAction<IWorkspaceImage | null>>;
  user: IUser;
  setLoaderState: React.Dispatch<React.SetStateAction<boolean>>;
  workspace?: IWorkspace;
}

const IoMdDownload = (): JSX.Element => (
  <AppSvg path="images/panel/common/file_download.svg" size="24px" />
);
const RiImageEditLine = (): JSX.Element => (
  <AppSvg path="images/panel/images/annotate-screenshot.svg" size="22px" />
);
const FiMoreHorizontal = (): JSX.Element => (
  <AppSvg path="images/panel/common/more_horiz.svg" size="24px" />
);

const SingleImagePageManageAreaTemplate: React.FC<Props> = ({
  image,
  setImage,
  user,
  setLoaderState,
  workspace,
}) => {
  const { errorHandler } = useErrorHandler()
  const { t } = useTranslation();
  const { workspaceImageDelete } = useWorkspaceImageDelete();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [dropBoxImageId, setDropBoxImageId] = useState<string>('');
  const [dropboxOperationLoading, setDropboxOperationLoading] = useState(false);
  const [uploadToCloudType, setUploadToCloudType] = useState<string>('');
  const [showCloudDeleteFileModal, setShowCloudDeleteFileModal] = useState<
    string | null
  >(null);
  const [driveImageId, setDriveImageId] = useState<string | null>('');

  const [deletionModalState, setDeletionModalState] = useState<IDeletionModal>({
    state: false,
    screenshot: null,
  });
  const [emailModalState, setEmailModalState] = useState<IEmailModal>({
    state: false,
    screenshot: null,
  });
  // const { commentsTemplate, setShowPicker } = useEnableComments({
  //   itemType: 'image',
  //   item: image,
  //   isPublic: false,
  //   user: user,
  // });
  const driveUser: DriveUser | null = useSelector(
    (state: RootStateOrAny) => state.auth.driveUser,
  );
  const [uploadToCloudModalState, setUploadToCloudModalState] =
    useState<boolean>(false);
  const [showDriveDeleteFileModal, setShowDriveDeleteFileModal] =
    useState(false);
  const [driveOperationLoading, setDriveOperationLoading] = useState(false);
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null);
  const explorerData: IExplorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerData,
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
    image,
    'image',
    workspace?.id || '',
    updateImageState,
  );
  const [shareLoadingState, setShareLoadingState] = useState(false);
  const folderName = image?.dbData?.folderData?.name || t('common.myImages');
  const currentlySavedIn = useMemo(
    () =>
      workspace
        ? workspace.folders.find((x) => x.id === image?.dbData?.parentId)
            ?.name || workspace.name
        : folderName,
    [image, workspace, folderName],
  );

  async function updateImageState(updatedImage: any) {
    dispatch(PanelAC.updateExplorerImageData({ image: updatedImage }));
    dispatch(PanelAC.setEditorImage({ editorImage: updatedImage }));
    setImage && setImage(updatedImage);
  }

  const externalListener = useCallback(
    async (message: IAppMessage, sender, sendResponse) => {
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

  useEffect(() => {
    browser.runtime.onMessageExternal.addListener(externalListener);
  }, [tab]);

  useEffect(() => {
    const currentDriveData = image?.dbData?.drivesData?.find(
      (x) => x.email === driveUser?.email,
    );
    currentDriveData && setDriveImageId(currentDriveData.driveId);
  }, [image, driveUser]);

  // -------> start of drive
  const updateExplorerDataDrive = (drivesData: IDriveDbData[]) => {
    if (image && image.dbData) {
      const updatedImage: IEditorImage = {
        ...image,
        dbData: { ...image.dbData, drivesData: drivesData },
      };
      const explorerDataIndex = explorerData.files.findIndex(
        (x) => x.dbData?.id === image.dbData?.id,
      );
      const explorerDatFilesCopy = explorerData.files.slice();
      explorerDatFilesCopy[explorerDataIndex] = updatedImage;
      dispatch(
        PanelAC.setExplorerData({
          explorerData: { ...explorerData, files: explorerDatFilesCopy },
        }),
      );
      dispatch(PanelAC.setEditorImage({ editorImage: updatedImage }));
    }
  };

  const deleteDriveImageConfirm = async () => {
    setShowDriveDeleteFileModal(false);
    setDriveOperationLoading(true);
    if (image?.dbData?.id) {
      const response = await deleteDriveItem(image.dbData?.id, 'image');

      if (response.status === ResStatusEnum.error) {
        console.log(response.message);
        setDriveOperationLoading(false);
        errorHandler(response);
      } else {
        updateExplorerDataDrive(response.data);
        setDriveImageId(null);
        setDriveOperationLoading(false);
        successMessage(t('toasts.fileDeletedFromDrive'));
      }
    }
  };

  const openUploadToCloudModal = async () => {
    if (!driveUser) {
      const tab = await browser.tabs.create({
        url: `${process.env.WEBSITE_URL}/auth/google-auth?driveLogin=true`,
      });
      console.log(tab);

      setTab(tab);
    } else {
      setUploadToCloudModalState(true);
    }
  };
  const closeUploadToCloudModal = () => {
    setUploadToCloudModalState(false);
  };

  const uploadToCloudHandler = async (name: string, type?: string) => {
    closeUploadToCloudModal();
    const res = await fetch(image.url);
    if (!type) {
      setDriveOperationLoading(true);
      const { data } = await driveUploadFile(
        name,
        await res.blob(),
        image.dbData?.id,
        'image',
      );
      if (data) {
        updateExplorerDataDrive(data.drivesData);
        setDriveImageId(data.fileId);
        successMessage(t('toasts.imageUploaded'));
      }
      setDriveOperationLoading(false);
    } else {
      setDropboxOperationLoading(true);
      const response = await dropboxFileUpload(
        name,
        await res.blob(),
        image.dbData?.id,
        'image',
      );
      if (response.status == ResStatusEnum.success) {
        setDropBoxImageId(response.data);
        successMessage(t('toasts.imageUploaded'));
      } else {
        errorMessage(response.message || t('toasts.somethingWentWrong'));
      }
      setDropboxOperationLoading(false);
    }
  };

  const openImageOnDrive = async () => {
    driveImageId &&
      browser.tabs.create({
        url: `https://drive.google.com/file/d/${driveImageId}/view`,
      });
  };

  // ------> end of drive

  const openDeleteModal = (screenshot: IEditorImage) => {
    setDeletionModalState({
      state: true,
      screenshot,
    });
  };

  const closeDeleteModal = () => {
    setDeletionModalState({
      state: false,
      screenshot: null,
    });
  };

  const openEmailModal = (screenshot: IEditorImage) => {
    setEmailModalState({
      state: true,
      screenshot,
    });
  };

  const closeEmailModal = () => {
    setEmailModalState({
      state: false,
      screenshot: null,
    });
  };

  const deleteScreenshotConfirm = async (screenshot: IEditorImage) => {
    closeDeleteModal();
    setLoaderState(true);

    if (workspace) {
      await workspaceImageDelete(screenshot, workspace);
      navigate(
        `${panelRoutes.edit.path}?workspaceId=${workspace.id}&id=${image.dbData?.id}`,
      );
    } else {
      await imageDelete(screenshot);
      navigate(panelRoutes.images.path);
    }

    setLoaderState(false);
  };

  const imageDelete = async (screenshot: IEditorImage) => {
    if (
      screenshot?.dbData?.parentId &&
      typeof screenshot?.dbData?.parentId == 'string'
    ) {
      const { data } = await getFolderByIdAPI(screenshot.dbData.parentId);
      if (data) {
        await decreaseFolderItems(data, 'image', 1);
      }
    }

    screenshot && (await moveRestoreTrash(screenshot));

    infoMessage(t('toasts.imageMovedToTrash'));
  };

  const localSaveFunction = async () => {
    try {
      if (image.dbData?.title) {
        localSave(image);
        successMessage(t('toasts.imageDownloaded'));
      }
    } catch (e) {
      errorHandler(e);
    }
  };

  const goToEdit = useCallback(async () => {
    dispatch(PanelAC.setFromExistedImage(false));
    navigate(
      workspace
        ? `${panelRoutes.edit.path}?workspaceId=${workspace.id}&id=${image.dbData?.id}`
        : `${panelRoutes.edit.path}?id=${image.dbData?.id}`,
    );
  }, [workspace]);

  const pdfSave = async () => {
    if (image) {
      const blob = await pdfFromImageUrl(image.url);
      successMessage(t('toasts.imageDownloaded'));
      saveAs(blob, image.dbData?.title);
      saveSegmentEvent(t('ext.imageDownloadAsPDF'), image.dbData);
    }
  };

  const clipboardCopy = async () => {
    try {
      const blob: Blob | null = await getBlobfromUrl(image.url);
      if (blob) {
        const item: ClipboardItemInterface = new window.ClipboardItem({
          'image/png': blob,
        });
        try {
          item && navigator.clipboard.write([item as any]);
          successMessage('toasts.copiedToClipboard');
          saveSegmentEvent(t('ext.imageCopied'));
        } catch (e) {
          errorHandler({ message: t('toasts.linkNotCopied') });
        }
      }
    } catch (e) {
      errorHandler(e);
    }
  };

  const openImageOnDropBox = async () => {
    if (window && dropBoxImageId != null) {
      const sourceUrl = `https://www.dropbox.com/home/Apps/Rec?preview=${dropBoxImageId}`;
      window.open(sourceUrl, '_blank');
      saveSegmentEvent('Opened dropbox Image', { title: image.dbData?.title });
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

  const deleteCloudItemConfirm = async () => {
    setShowCloudDeleteFileModal(null);
    if (showCloudDeleteFileModal == 'Dropbox') {
      setDropboxOperationLoading(true);
      const response = await deleteDropboxItem(image.dbData?.id, 'image');
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

  const moreMenu = (
    <Menu>
      <Menu.Item
        icon={
          <AppSvg
            size="18px"
            path="images/panel/common/file_download_black.svg"
          />
        }
        onClick={pdfSave}
        key="menu_item_pdf"
      >
        <span className="tw-text-xs">{t('page.image.downloadAsPDF')}</span>
      </Menu.Item>

      <Menu.Item
        icon={<AppSvg size="18px" path="images/panel/common/copy_black.svg" />}
        onClick={clipboardCopy}
        key="menu_item_copy"
      >
        <span className="tw-text-xs">{t('page.image.copyToClipboard')}</span>
      </Menu.Item>

      <Menu.Item
        icon={<AppSvg size="18px" path="images/panel/common/Outline.svg" />}
        onClick={() => openEmailModal(image)}
        key="menu_item_email"
      >
        <span className="tw-text-xs">{t('page.image.email')}</span>
      </Menu.Item>

      <Menu.Item
        icon={<AppSvg size="18px" path="images/panel/common/trash.svg" />}
        onClick={() => openDeleteModal(image)}
        key="menu_item_delete"
      >
        <span className="tw-text-xs">{t('page.image.deleteImage')}</span>
      </Menu.Item>
    </Menu>
  );

  const hideEmojis = async () => {
    // setShowPicker(false);
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
      <div className="tw-bg-blue-grey tw-rounded-2lg tw-py-0 tw-px-0 tw-shadow-md">
        <Tabs selectedTabClassName="react-tabs__tab--selected tw-text-primary-purple tw-font-bold">
          <TabList className="tw-flex tw-mb-0">
            <Tab
              className="tw-flex tw-justify-center tw-items-center tw-w-1/2 tw-h-50px tw-cursor-pointer tw-outline-none"
              onClick={hideEmojis}
            >
              <div className="tw-mr-2">
                <AppSvg
                  path="images/panel/common/icon-Manage-light.svg"
                  size={'25px'}
                />
              </div>
              <div>{t('page.image.manage')}</div>
            </Tab>
            {/* <Tab className="tw-flex tw-justify-center tw-items-center tw-w-1/2 tw-h-50px tw-cursor-pointer tw-outline-none">
              <div className="tw-mr-2">
                <AppSvg path="images/panel/common/comments.svg" size={'25px'} />
              </div>
              <div>Comments</div>
            </Tab> */}
          </TabList>
          <TabPanel>
            <ImageActionsCard className="tw-rounded-t-none">
              <div>
                {t('page.image.currentlySavedIn')}
                <strong className="tw-ml-1.5">{currentlySavedIn}</strong>
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
                  title={t('page.image.download')}
                  icon={IoMdDownload}
                  onClick={localSaveFunction}
                  outerClassName={styles.containerImageAction}
                  circleClassName={styles.innerCircle}
                  iconColor="#5B4DBE"
                />

                <ImageActionItem
                  title={t('page.image.annotate')}
                  icon={RiImageEditLine}
                  onClick={goToEdit}
                  outerClassName={styles.containerImageAction}
                  circleClassName={styles.innerCircle}
                  iconColor="#5B4DBE"
                />

                <Dropdown
                  trigger={['click']}
                  overlay={moreMenu}
                  placement="bottomLeft"
                >
                  <ImageActionItem
                    title={t('page.image.more')}
                    icon={FiMoreHorizontal}
                    outerClassName={styles.containerImageAction}
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
                          size={'25px'}
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
                    {t('page.image.shareYourImage')}
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

            {!workspace && (
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
                          <div className={styles.openImageText}>
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
                          driveImageId && driveUser
                            ? openImageOnDrive
                            : openUploadToCloudModal
                        }
                      >
                        <div
                          className={classNames(styles.svgWrapper, 'tw-flex')}
                        >
                          <AppSvg
                            path="/images/panel/common/google-drive-logo.svg"
                            size="25px"
                          />
                          <div className={styles.providerText}>
                            {driveImageId && driveUser ? (
                              <div className={styles.openImageText}>
                                {t('page.image.openImage')}
                              </div>
                            ) : (
                              driveUser?.email || 'Google Drive'
                            )}
                          </div>
                        </div>
                      </AppButton>
                    )}
                    {driveImageId && (
                      <AppButton
                        onMouseLeave={onMouseLeaveCloudButtonsHandler}
                        onClick={() => setShowDriveDeleteFileModal(true)}
                        className={styles.deleteDriveItemBtn}
                      >
                        <AppSvg
                          size="24px"
                          path="/images/panel/common/delete-bin.svg"
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
                          ? openImageOnDropBox()
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
                        <div
                          className={classNames(styles.svgWrapper, 'tw-flex')}
                        >
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
                      onClick={() => infoMessage('Coming soon...')}
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
                      onClick={() => infoMessage('Coming soon...')}
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
            )}
          </TabPanel>
          {/* <TabPanel
            className="tw-bg-white tw-flex tw-flex-col tw-justify-between tw-rounded-b-md tw-rounded-tl-md"
            selectedClassName="react-tabs__tab-panel--selected tw-min-h-500px tw-p-5"
          >
            {commentsTemplate}
          </TabPanel> */}
        </Tabs>
      </div>
      <UploadToCloudModal
        type={uploadToCloudType}
        oldName={image?.dbData?.title}
        visible={uploadToCloudModalState}
        onClose={closeUploadToCloudModal}
        onOk={uploadToCloudHandler}
      />
      <DeleteItemModal
        visible={deletionModalState.state}
        item={deletionModalState.screenshot}
        itemType="image"
        onOk={deleteScreenshotConfirm}
        onCancel={closeDeleteModal}
      />
      <EmailModal
        visible={emailModalState.state}
        item={emailModalState.screenshot}
        onCancel={closeEmailModal}
        itemType={'image'}
        itemPublicLink={image?.url}
      />
      <DeleteDriveFileModal
        visible={showDriveDeleteFileModal}
        onOk={deleteDriveImageConfirm}
        onCancel={() => setShowDriveDeleteFileModal(false)}
      />
      {!workspace && (
        <ItemsFolderModal
          visible={showFolderModal}
          mainItem={image}
          onCancel={() => setShowFolderModal(false)}
          type={'image'}
          loader={setLoaderState}
        />
      )}
      {workspace && setImage && (
        <WorkspaceItemsFolderModal
          visible={showFolderModal}
          updateSingleItem={setImage as any}
          items={[image as IWorkspaceImage]}
          onCancel={() => setShowFolderModal(false)}
        />
      )}
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

export default SingleImagePageManageAreaTemplate;
