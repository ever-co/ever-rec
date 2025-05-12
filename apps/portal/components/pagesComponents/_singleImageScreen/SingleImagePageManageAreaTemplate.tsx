import useAuthenticateUser from '../../../hooks/useAuthenticateUser';
import useEnableComments from '../../../hooks/useEnableComments/useEnableComments';
import IEditorImage from '../../../app/interfaces/IEditorImage';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import AppSvg from '../../elements/AppSvg';
import ImageActionsCard from './imageActions/ImageActionsCard';
import styles from '../../../pagesScss/image/Image.module.scss';
import ImageActionItem from './imageActions/ImageActionItem';
import { IoMdDownload } from 'react-icons/io';
import { Dropdown, Menu } from 'antd';
import { FiMoreHorizontal } from 'react-icons/fi';
import AppButton from '../../controls/AppButton';
import { IoCopyOutline } from 'react-icons/io5';
import classNames from 'classnames';
import AppSpinnerLocal from '../../containers/appSpinnerLocal/AppSpinnerLocal';
import React, { useEffect, useMemo, useState } from 'react';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/router';
import useGoogleDriveAuth from '../../../hooks/useGoogleDriveAuth';
import IExplorerData from '../../../app/interfaces/IExplorerData';
import useCloudSaveButtons from '../../../hooks/useCloudSaveButtons';
import { DriveUser } from 'app/services/google/auth';
import { IDriveDbData } from 'app/interfaces/IDriveDbData';
import PanelAC from '../../../app/store/panel/actions/PanelAC';
import { deleteDriveItem, driveUploadFile } from 'app/services/google/drive';
import {
  errorMessage,
  infoMessage,
  successMessage,
} from 'app/services/helpers/toastMessages';
import { dropboxFileUpload, saveSegmentEvent } from 'app/services/general';
import { ResStatusEnum } from 'app/interfaces/IApiResponse';
import { errorHandler } from 'app/services/helpers/errors';
import { deleteDropboxItem } from 'app/services/api/messages';
import { panelRoutes, preRoutes } from '../../_routes';
import { getFolderByIdAPI } from 'app/services/api/image';
import { decreaseFolderItems } from 'app/services/helpers/manageFolders';
import { moveRestoreTrash } from 'app/services/screenshots';
import {
  getBlobfromUrl,
  localSave,
  pdfFromImageUrl,
} from 'app/utilities/images';
import { saveAs } from 'file-saver';
import { deletionModalIntF, emailModalIntF } from 'pages/image/[id]';
import UploadToCloudModal from 'components/pagesComponents/_singleImageScreen/uploadToCloudModal/UploadToCloudModal';
import EmailModal from 'components/elements/EmailModal';
import ItemsFolderModal from 'components/pagesComponents/_imagesScreen/components/itemsFolderModal/ItemsFolderModal';
import DeleteCloudFileModal from '../../shared/DeleteCloudFileModal';
import { IWorkspace, IWorkspaceImage } from 'app/interfaces/IWorkspace';
import WorkspaceItemsFolderModal from '../_imagesScreen/components/itemsFolderModal/WorkspaceItemsFolderModal';
import DeleteItemModal from 'components/shared/DeleteItemModal';
import { useWorkspaceImageDelete } from 'misc/workspaceFunctions';
import useGenerateShareLink from 'hooks/useGenerateShareLink';
import { useTranslation } from 'react-i18next';

interface Props {
  image: IEditorImage | IWorkspaceImage;
  setImage?: React.Dispatch<
    React.SetStateAction<IEditorImage | IWorkspaceImage>
  >;
  workspace?: IWorkspace;
  setLoaderState: React.Dispatch<React.SetStateAction<boolean>>;
}

const RiImageEditLine = (): JSX.Element => (
  <AppSvg path="/images/annotate-screenshot.svg" size="22px" />
);

const SingleImagePageManageAreaTemplate: React.FC<Props> = ({
  image,
  setImage,
  workspace,
  setLoaderState,
}) => {
  const { workspaceImageDelete } = useWorkspaceImageDelete();
  const user = useAuthenticateUser();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const router = useRouter();
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [deletionModalState, setDeletionModalState] =
    useState<deletionModalIntF>({ state: false, screenshot: null });
  const [emailModalState, setEmailModalState] = useState<emailModalIntF>({
    state: false,
    screenshot: null,
  });
  const { driveLogin } = useGoogleDriveAuth({
    pathname: router.query?.id ? `/image/${router.query?.id}` : '/media/images',
  });
  // const { commentsTemplate, setShowPicker } = useEnableComments({
  //   itemType: 'image',
  //   item: image,
  //   user,
  //   isPublic: false,
  // });
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
  const driveUser: DriveUser | null = useSelector(
    (state: RootStateOrAny) => state.auth.driveUser,
  );
  const [uploadToCloudType, setUploadToCloudType] = useState<string | null>(
    null,
  );
  const [driveImageId, setDriveImageId] = useState<string | null>('');
  const [dropBoxImageId, setDropBoxImageId] = useState<string | null>('');
  const [uploadToCloudModalState, setUploadToCloudModalState] =
    useState<boolean>(false);
  const [showCloudDeleteFileModal, setShowCloudDeleteFileModal] = useState<
    string | null
  >(null);
  const [driveOperationLoading, setDriveOperationLoading] = useState(false);
  const [dropboxOperationLoading, setDropboxOperationLoading] = useState(false);
  const folderName = image?.dbData?.folderData?.name || t('common.myImages');
  const currentlySavedIn = useMemo(
    () =>
      workspace
        ? workspace.folders.find((x) => x.id === image.dbData?.parentId)
            ?.name || workspace.name
        : folderName,
    [image, workspace, folderName],
  );
  const {
    sharedLink,
    copyLinkHandler,
    getShareableLinkHandler,
    deleteShareLink,
  } = useGenerateShareLink(
    image,
    'image',
    workspace?.id as string,
    updateImageState,
  );
  const [shareLoadingState, setShareLoadingState] = useState(false);

  async function updateImageState(updatedImage: IEditorImage) {
    dispatch(PanelAC.updateExplorerImageData({ image: updatedImage }));
    dispatch(PanelAC.setEditorImage({ editorImage: updatedImage }));
    setImage && setImage(updatedImage);
  }

  // --------> drive functionality
  useEffect(() => {
    const currentDriveData = image?.dbData?.drivesData?.find(
      (x) => x.email === driveUser?.email,
    );
    currentDriveData && setDriveImageId(currentDriveData.driveId);
    if (image?.dbData?.dropBoxData) {
      setDropBoxImageId(image?.dbData?.dropBoxData?.name);
    }
  }, [image, driveUser]);

  const openDeleteModal = (screenshot: IEditorImage) => {
    setDeletionModalState({
      state: true,
      screenshot,
    });
  };

  const updateExplorerDataDrive = (drivesData: IDriveDbData[]) => {
    const updatedImage = {
      ...image,
      dbData: { ...image.dbData, drivesData: drivesData },
    };
    const explorerDataIndex = explorerData.files.findIndex(
      (x) => x.dbData?.id === image.dbData?.id,
    );
    const explorerDatFilesCopy = explorerData.files.slice();
    explorerDatFilesCopy[explorerDataIndex] = updatedImage as any;
    dispatch(
      PanelAC.setExplorerData({
        explorerData: { ...explorerData, files: explorerDatFilesCopy },
      }),
    );
    dispatch(PanelAC.setEditorImage({ editorImage: updatedImage as any }));
  };

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

  const uploadToCloudHandler = async (name: string, type?: string) => {
    closeUploadToCloudModal();
    const res = await fetch(image.url as string);
    if (!type) {
      setDriveOperationLoading(true);
      const { data } = await driveUploadFile(
        name,
        await res.blob(),
        image.dbData?.id as string,
        'image',
      );
      if (data && explorerData?.files) {
        updateExplorerDataDrive(data.drivesData);
        setDriveImageId(data.fileId);
        successMessage(t('toasts.imageUploaded'));
        await saveSegmentEvent('Image uploaded to google drive', {
          title: image.dbData?.title,
        });
      }
      setDriveOperationLoading(false);
    } else {
      setDropboxOperationLoading(true);
      const response = await dropboxFileUpload(
        name,
        await res.blob(),
        image.dbData?.id as string,
        'image',
      );
      if (response.status == ResStatusEnum.success) {
        setDropBoxImageId(response.data);
        successMessage('Image uploaded successfully.');
      } else {
        errorMessage(response.message || t('toasts.somethingWentWrong'));
      }
      setDropboxOperationLoading(false);
    }
  };

  const deleteDriveImageConfirm = async () => {
    setShowCloudDeleteFileModal(null);
    if (showCloudDeleteFileModal == 'drive') {
      setDriveOperationLoading(true);
      const response = await deleteDriveItem(
        image.dbData?.id as string,
        'image',
      );

      if (response.status === ResStatusEnum.error) {
        setDriveOperationLoading(false);
        errorHandler(response);
      } else {
        updateExplorerDataDrive(response.data);
        setDriveImageId(null);
        setDriveOperationLoading(false);
        successMessage(t('toasts.fileDeletedFromDrive'));
      }
    }
    if (showCloudDeleteFileModal == 'Dropbox') {
      setDropboxOperationLoading(true);
      const response = await deleteDropboxItem(
        image.dbData?.id as string,
        'image',
      );
      if (response.status === ResStatusEnum.error) {
        console.log(response.message);
        setDropboxOperationLoading(false);
        errorHandler(response);
      } else {
        setDropBoxImageId(null);
        setDropboxOperationLoading(false);
        successMessage(t('toasts.fileDeletedFromDropbox'));
      }
    }
  };

  const openImageOnDrive = async () => {
    driveImageId &&
      window &&
      window
        .open(`https://drive.google.com/file/d/${driveImageId}/view`, '_blank')
        ?.focus();
    await saveSegmentEvent('Opened google drive Image', {
      title: image.dbData?.title,
    });
  };
  // -------> end of drive functionality

  const openImageOnDropBox = async () => {
    dropBoxImageId &&
      window &&
      window
        .open(
          `https://www.dropbox.com/home/Apps/Rec?preview=${dropBoxImageId}`,
          '_blank',
        )
        ?.focus();
    await saveSegmentEvent('Opened dropbox Image', {
      title: image.dbData?.title,
    });
  };

  const openUploadToDropBoxCloudModal = async (type) => {
    if (user?.dropbox?.isDropBoxIntegrated) {
      setUploadToCloudType(type);
      setUploadToCloudModalState(true);
    } else {
      router.push(preRoutes.media + panelRoutes.integrations);
    }
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

  const deleteScreenshotConfirm = async (screenshot: IEditorImage | null) => {
    closeDeleteModal();
    setLoaderState(true);

    if (workspace) {
      await workspaceImageDelete(screenshot as IWorkspaceImage, workspace);
      router.push(preRoutes.media + panelRoutes.workspace + `/${workspace.id}`);
    } else {
      await imageDelete(screenshot as IWorkspaceImage);
      router.push(preRoutes.media + panelRoutes.images);
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

  const goToEdit = async () => {
    if (image) {
      setLoaderState(true);
      dispatch(PanelAC.setEditorImage({ editorImage: image }));
      await saveSegmentEvent('Opened Image Annotate', {
        id: image.dbData?.id,
        title: image.dbData?.title,
      });
      const query = workspace ? `?workspaceId=${workspace.id}` : '';
      await router.push(`/edit/${image.dbData?.id}${query}`);
      setLoaderState(false);
    }
  };

  const pdfSave = async () => {
    if (image) {
      const blob = await pdfFromImageUrl(image.url as string);
      successMessage(t('toasts.imageDownloaded'));
      saveAs(blob, image.dbData?.title);
      await saveSegmentEvent('Image PDF Downloaded', {
        title: image.dbData?.title,
      });
    }
  };

  const clipboardCopy = async () => {
    try {
      const blob: Blob | null = await getBlobfromUrl(image.url as string);
      if (blob) {
        const item = new window.ClipboardItem({
          'image/png': blob,
        });
        try {
          item && window.navigator.clipboard.write([item]);
          successMessage(t('toasts.copiedToClipboard'));
          await saveSegmentEvent('Image Copied to clipboard');
        } catch (e) {
          errorHandler({ message: t('toasts.linkNotCopied') });
        }
      }
    } catch (e) {
      errorHandler(e);
    }
  };

  const moreMenu = (
    <Menu>
      <Menu.Item
        icon={<AppSvg size="18px" path="/images/file_download_black.svg" />}
        onClick={pdfSave}
        key="menu_item_pdf"
      >
        <span className="tw-text-xs">{t('page.image.downloadAsPDF')}</span>
      </Menu.Item>

      <Menu.Item
        icon={<AppSvg size="18px" path="/images/copy_black.svg" />}
        onClick={clipboardCopy}
        key="menu_item_copy"
      >
        <span className="tw-text-xs">{t('page.image.copyToClipboard')}</span>
      </Menu.Item>

      <Menu.Item
        icon={<AppSvg size="18px" path="/images/Outline.svg" />}
        onClick={() => openEmailModal(image)}
        key="menu_item_email"
      >
        <span className="tw-text-xs">{t('page.image.email')}</span>
      </Menu.Item>

      <Menu.Item
        icon={<AppSvg size="18px" path="/images/trash.svg" />}
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

  const handleLocalSave = async (item) => {
    await localSave(item);
    await saveSegmentEvent('Image Downloaded', item);
    successMessage('Image downloaded');
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
                <AppSvg path="/images/icon-Manage-light.svg" size="25px" />
              </div>
              <div>{t('page.image.manage')}</div>
            </Tab>
            {/* <Tab className="tw-flex tw-justify-center tw-items-center tw-w-1/2 tw-h-50px tw-cursor-pointer tw-outline-none">
              <div className="tw-mr-2">
                <AppSvg path="/images/comments.svg" size="25px" />
              </div>
              <div>Comments</div>
            </Tab> */}
          </TabList>
          <TabPanel selectedClassName={styles.selectedTabPanel}>
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
                    path="/images/right-arrow.svg"
                    className="tw-ml-4"
                  />
                </div>
              </div>
            </ImageActionsCard>
            <ImageActionsCard>
              <div className=" tw-grid tw-gap-4 tw-grid-cols-3 tw-justify-items-center across-btns:tw-gap-1 across-btns:tw-grid-rows-1 across-btns:tw-place-items-center">
                <ImageActionItem
                  title={t('page.image.download')}
                  icon={IoMdDownload}
                  onClick={() => handleLocalSave(image)}
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
                        <IoCopyOutline size={25} className="tw-mr-2" />
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
                  {t('page.image.saveToCloud')}{' '}
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
                            path="/images/google-drive-logo.svg"
                            size="25px"
                          />
                          <div className={styles.providerText}>
                            {driveImageId && driveUser ? (
                              <div className={styles.openImageText}>
                                {t('page.image.openImage')}
                              </div>
                            ) : (
                              driveUser?.email || t('page.image.googleDrive')
                            )}
                          </div>
                        </div>
                      </AppButton>
                    )}
                    {driveImageId && (
                      <AppButton
                        onClick={() => setShowCloudDeleteFileModal('drive')}
                        onMouseLeave={onMouseLeaveCloudButtonsHandler}
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
                          <AppSvg path="/images/dropbox-logo.svg" size="25px" />
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
                        <AppSvg size="24px" path="/images/delete-bin.svg" />
                      </AppButton>
                    )}
                  </div>
                </div>
              </ImageActionsCard>
            )}
          </TabPanel>
        </Tabs>
      </div>
      <UploadToCloudModal
        type={uploadToCloudType as string}
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
        itemPublicLink={image?.url as string}
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
      {workspace && (
        <WorkspaceItemsFolderModal
          visible={showFolderModal}
          updateSingleItem={setImage}
          setVisible={setShowFolderModal}
          items={[image as IWorkspaceImage]}
          onCancel={() => setShowFolderModal(false)}
          setLoading={setLoaderState}
        />
      )}
      {!!showCloudDeleteFileModal && (
        <DeleteCloudFileModal
          visible={true}
          type={showCloudDeleteFileModal}
          onOk={deleteDriveImageConfirm}
          onCancel={() => setShowCloudDeleteFileModal(null)}
        />
      )}
    </>
  );
};

export default SingleImagePageManageAreaTemplate;
