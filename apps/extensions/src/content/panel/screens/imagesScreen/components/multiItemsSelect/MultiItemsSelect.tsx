import { useEffect, useState } from 'react';
import * as styles from './MultiItemsSelect.module.scss';
import { MixedItemType } from '@/app/interfaces/ItemTypes';
import IEditorImage from '@/app/interfaces/IEditorImage';
import IEditorVideo from '@/app/interfaces/IEditorVideo';
import AppButton from '@/content/components/controls/appButton/AppButton';
import DeleteMultiItemsModal from '../deleteMultiItems/DeleteMultiItemsModal';
import {
  loadingMessage,
  updateMessage,
  successMessage,
  infoMessage,
  errorMessage,
} from '@/app/services/helpers/toastMessages';
import {
  moveRestoreTrash,
  updateImageDisplayData,
  deleteScreenshot,
  deleteAllScreenshots,
  restoreAllScreenshots,
} from '@/app/services/screenshots';
import {
  downloadVideo,
  moveRestoreVideoTrash,
  updateVideoDisplayData,
  deleteVideo,
  restoreAllVideos,
  deleteAllVideos,
} from '@/app/services/videos';
import { localSave } from '@/app/utilities/images';
import ItemsFolderModal from '@/content/panel/screens/imagesScreen/components/itemsFolderModal/ItemsFolderModal';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import IExplorerData from '@/app/interfaces/IExplorerData';
import { RootStateOrAny, useSelector } from 'react-redux';
import { decreaseFolderItems } from '@/app/services/helpers/manageFolders';
import TrashModal from '../../pages/trashed/components/TrashModal/TrashModal';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';

interface IMultiItemsSelectProps {
  type: MixedItemType;
  items: (IEditorImage | IEditorVideo)[];
  show: boolean;
  screenshots?: IEditorImage[];
  videos?: IEditorVideo[];
  resetSelected: React.Dispatch<
    React.SetStateAction<{
      state: boolean;
      items: (IEditorImage | IEditorVideo)[];
    }>
  >;
  addSelected: React.Dispatch<
    React.SetStateAction<{
      state: boolean;
      items: (IEditorImage | IEditorVideo)[];
    }>
  >;
  isTrash?: boolean;
}
const MultiItemsSelect: React.FC<IMultiItemsSelectProps> = ({
  items,
  type,
  show,
  resetSelected,
  addSelected,
  screenshots,
  videos,
  isTrash,
}) => {
  const { t } = useTranslation();
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [loader, setLoader] = useState<boolean>(false);
  const explorerDataImages: IExplorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerData,
  );
  const explorerDataVideos: IExplorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerDataVideos,
  );
  const [selected, setSelected] = useState<boolean>(false);
  const [deleteModal, setDeleteModal] = useState<boolean>(false);
  const [restoreModal, setRestoreModal] = useState<boolean>(false);
  const [deletionModalStateImage, setDeletionModalStateImage] = useState<{
    state: boolean;
    screenshot: IEditorImage | null;
  }>({ state: false, screenshot: null });
  const [dropdown, setDropdownVisible] = useState({
    item: null,
    visible: false,
  });
  const [deletionModalStateVideo, setDeletionModalStateVideo] = useState<{
    state: boolean;
    video: IEditorVideo | null;
  }>({ state: false, video: null });

  const closeAllModals = () => {
    setShowDeleteModal(false);
    setShowFolderModal(false);
  };

  useEffect(() => {
    if (!loader) {
      if (type == 'image') {
        resetSelected({ state: false, items: [] });
        //store.dispatch(PanelAC.resetExplorerDataLoader());
      } else if (type == 'video') {
        resetSelected({ state: false, items: [] });
        //store.dispatch(PanelAC.resetExplorerDataLoaderVideos());
      } else if (type == 'mixed') {
        resetSelected({ state: false, items: [] });
        //store.dispatch(PanelAC.resetExplorerDataLoaderVideos());
      }
    }
  }, [loader]);

  useEffect(() => {
    const mixedItems = screenshots?.concat(videos as any);
    if (type === 'image') {
      if (items.length > 0) {
        addSelected({ state: true, items: screenshots as any });
      }
      if (screenshots && !selected && items.length <= screenshots.length) {
        resetSelected({ state: false, items: [] });
      }
    } else if (type === 'video') {
      if (items.length > 0) {
        addSelected({ state: true, items: videos as any });
      }
      if (videos && !selected && items.length <= videos.length) {
        resetSelected({ state: false, items: [] });
      }
    } else if (type === 'mixed') {
      if (items.length > 0) {
        addSelected({ state: true, items: mixedItems as any });
      }
      if (mixedItems && !selected && items.length <= mixedItems.length) {
        resetSelected({ state: false, items: [] });
      }
    }
  }, [selected]);

  const onDownloadHandler = async () => {
    const downloadPromises = items.map((item) => {
      if (type === 'image') return localSave(item);
      else if (type === 'video') return downloadVideo(item);
    });

    const s = items.length > 1 ? 's' : '';
    const toast = loadingMessage(`${t('toasts.downloading')} ${type}${s}...`);

    await Promise.all(downloadPromises);

    const typeUpper = type === 'video' ? 'Video' : 'Image';
    updateMessage(
      toast,
      `${typeUpper}${s} ${t('toasts.downloaded')}.`,
      'success',
    );
    resetSelected({ state: false, items: [] });
  };

  const deleteItemsConfirm = async () => {
    closeAllModals();
    const s = items.length > 1 ? 's' : '';
    const toast = loadingMessage(
      `${t('toasts.moving')} ${type}${s} ${t('toasts.toTrash')}`,
    );
    const deletePromises = items.map((item) => {
      if (type === 'image') return moveRestoreTrash(item, true, true);
      else if (type === 'video') return moveRestoreVideoTrash(item, true, true);
    });

    await Promise.all(deletePromises);

    const currentFolder =
      type === 'video'
        ? explorerDataVideos.currentFolder
        : explorerDataImages.currentFolder;

    if (type === 'image') {
      updateImageDisplayData(currentFolder ? currentFolder.id : false);
    } else if (type === 'video') {
      updateVideoDisplayData(currentFolder ? currentFolder.id : false);
    }

    if (currentFolder) {
      await decreaseFolderItems(currentFolder, type, items.length);
    }

    resetSelected({ state: false, items: [] });

    const typeUpper = type === 'video' ? 'Video' : 'Image';
    updateMessage(
      toast,
      `${typeUpper}${s} ${t('toasts.movedToTrash')}`,
      'success',
    );
  };

  const selectAllHandler = () => {
    setSelected(!selected);
  };

  const deleteScreenshotConfirm = async (image: IEditorImage | null) => {
    setDeletionModalStateImage({
      state: false,
      screenshot: null,
    });
    resetDropdownVisible();
    if (!image) return;

    let hasError = false;
    try {
      setLoader(true);
      await deleteScreenshot(image);
    } catch (error) {
      errorMessage(t('toasts.problemTryAgain'));
      hasError = true;
    } finally {
      setLoader(false);
    }
    if (hasError) return;
    infoMessage(t('toasts.imageDeleted'));
  };

  const deleteVideoConfirm = async (video: IEditorVideo | null) => {
    setDeletionModalStateVideo({
      state: false,
      video: null,
    });
    resetDropdownVisible();
    if (!video) return;

    let hasError = false;
    try {
      setLoader(true);
      await deleteVideo(video);
    } catch (error) {
      errorMessage(t('toasts.problemTryAgain'));
      hasError = true;
    } finally {
      setLoader(false);
    }

    if (hasError) return;

    infoMessage(t('toasts.videoDeleted'));
  };

  const deleteAllItems = async () => {
    setDeleteModal(false);

    if (!screenshots && !videos) {
      return infoMessage(t('toasts.noItemsToDelete'));
    }

    if (screenshots !== undefined && videos !== undefined) {
      if (screenshots.length + videos.length === items.length) {
        setLoader(true);
        await deleteAllVideos();
        await deleteAllScreenshots();
        setLoader(false);
        successMessage(t('toasts.itemsDeleted'));
      } else {
        items.map((item) => {
          if (
            (item && item.dbData?.refName.includes('jpeg')) ||
            (item && item.dbData?.refName.includes('jpg')) ||
            (item && item.dbData?.refName.includes('png'))
          ) {
            return deleteScreenshotConfirm(item);
          } else if (
            (item && item.dbData?.refName.includes('mp4')) ||
            (item && item.dbData?.refName.includes('mov')) ||
            (item && item.dbData?.refName.includes('avi'))
          ) {
            return deleteVideoConfirm(item);
          }
        });
      }
    }
  };

  const restoreAllItems = async () => {
    setRestoreModal(false);

    if (!screenshots && !videos) {
      return infoMessage(t('toasts.noItemsToRestore'));
    }

    if (screenshots !== undefined && videos !== undefined) {
      if (screenshots.length + videos.length === items.length) {
        setLoader(true);
        await restoreAllVideos();
        await restoreAllScreenshots();
        setLoader(false);
        successMessage(t('toasts.itemsRestored'));
      } else {
        items.map((item) => {
          if (
            (item && item.dbData?.refName.includes('jpeg')) ||
            (item && item.dbData?.refName.includes('jpg')) ||
            (item && item.dbData?.refName.includes('png'))
          ) {
            return restoreFromTrashHandler(item, 'Image');
          } else if (
            (item && item.dbData?.refName.includes('mp4')) ||
            (item && item.dbData?.refName.includes('mov')) ||
            (item && item.dbData?.refName.includes('avi')) ||
            (item && item.dbData?.refName.includes('webm'))
          ) {
            return restoreFromTrashHandler(item, 'Video');
          }
        });
        items.length > 1
          ? successMessage(t('toasts.itemsRestored'))
          : successMessage(t('toasts.itemRestored'));
      }
    }
  };

  const restoreFromTrashHandler = async (
    screenOrVideo: IEditorVideo | IEditorImage,
    type: string,
  ) => {
    if (!screenOrVideo) return;

    let hasError = false;
    try {
      setLoader(true);
      if (type == 'Video') {
        await moveRestoreVideoTrash(screenOrVideo, false);
      } else if (type == 'Image') {
        await moveRestoreTrash(screenOrVideo, false);
      } else {
        await moveRestoreVideoTrash(screenOrVideo, false);
        await moveRestoreTrash(screenOrVideo, false);
      }
    } catch (error) {
      errorMessage(t('toasts.problemRestoring'));
      hasError = true;
    } finally {
      setLoader(false);
    }

    if (hasError) return;
  };

  const resetDropdownVisible = () => {
    setDropdownVisible({
      item: null,
      visible: false,
    });
  };

  if (!show) return null;

  return (
    <div
      className={classNames(
        'tw-flex tw-justify-around tw-items-center tw-bg-gallery-grey tw-rounded-md tw-p-5px tw-px-2 tw-mx-4',
        isTrash && styles.trash,
        styles.MultiItemsSelect,
      )}
    >
      <div className="tw-flex">
        <AppButton
          onClick={selectAllHandler}
          className="multi-button tw-mx-5px"
          bgColor="tw-bg-white"
          outlined={false}
        >
          <div className="tw-text-gray-600 tw-leading-6 tw-font-normal tw-fontFamily-roboto">
            {selected
              ? t('common.bulkActions.selectNone')
              : t('common.bulkActions.selectAll')}{' '}
          </div>
        </AppButton>

        {isTrash ? (
          <AppButton
            onClick={() => setRestoreModal(true)}
            className="multi-button tw-mx-5px"
            bgColor="tw-bg-white"
            outlined={false}
          >
            <div className="tw-text-gray-600 tw-leading-6 tw-font-normal tw-fontFamily-roboto">
              {t('common.bulkActions.restore')}
            </div>
          </AppButton>
        ) : (
          <>
            <AppButton
              onClick={onDownloadHandler}
              className="multi-button tw-mx-5px"
              bgColor="tw-bg-white"
              outlined={false}
            >
              <div className="tw-text-gray-600 tw-leading-6 tw-font-normal tw-fontFamily-roboto">
                {t('common.bulkActions.download')}
              </div>
            </AppButton>
          </>
        )}
      </div>

      <div className="tw-flex">
        {!isTrash && (
          <AppButton
            onClick={() => setShowFolderModal(true)}
            className="multi-button tw-mx-5px"
            bgColor="tw-bg-white"
          >
            <div className="tw-text-gray-600 tw-leading-6 tw-font-normal tw-fontFamily-roboto">
              {t('common.bulkActions.move')}
            </div>
          </AppButton>
        )}

        <AppButton
          className="multi-button tw-mx-5px"
          bgColor="tw-bg-white"
          outlined={false}
          onClick={() =>
            isTrash ? setDeleteModal(true) : setShowDeleteModal(true)
          }
        >
          <div className="tw-text-red tw-leading-6 tw-font-normal tw-fontFamily-roboto">
            {t('common.bulkActions.delete')}
          </div>
        </AppButton>
      </div>

      <ItemsFolderModal
        visible={showFolderModal}
        type={type}
        mainItem={null}
        onCancel={closeAllModals}
        items={items}
        loader={setLoader}
      />
      <DeleteMultiItemsModal
        visible={showDeleteModal}
        type={type}
        onClose={closeAllModals}
        onOkHandler={deleteItemsConfirm}
      />
      <TrashModal
        visible={restoreModal}
        onCancel={() => setRestoreModal(false)}
        onOk={restoreAllItems}
        title={
          items.length > 1
           ? t('common.bulkActions.restoreAll')
            : t('common.bulkActions.restoreSingle')
        }
        confirmText={t('common.bulkActions.restore')}
        />
      <TrashModal
        visible={deleteModal}
        onCancel={() => setDeleteModal(false)}
        onOk={deleteAllItems}
        title={
          items.length > 1
            ? t('common.bulkActions.deleteAll')
            : t('common.bulkActions.deleteSingle')
        }
        confirmText={t('common.bulkActions.delete')}
        confirmClass="tw-bg-red"
      />
      <AppSpinner show={loader} />
    </div>
  );
};

export default MultiItemsSelect;
