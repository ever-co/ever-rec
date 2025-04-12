import React, { useEffect, useState } from 'react';
import { RootStateOrAny, useSelector } from 'react-redux';
import { MixedItemType } from 'app/interfaces/ItemType';
import IEditorImage from 'app/interfaces/IEditorImage';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import AppButton from 'components/controls/AppButton';
import DeleteMultiItemsModal from '../DeleteMultiItemsModal';
import {
  loadingMessage,
  updateMessage,
  successMessage,
  infoMessage,
  errorMessage,
} from 'app/services/helpers/toastMessages';
import {
  moveRestoreTrash,
  updateImageDisplayData,
  deleteScreenshot,
  deleteAllScreenshots,
  restoreAllScreenshots,
} from 'app/services/screenshots';
import {
  downloadVideo,
  moveRestoreVideoTrash,
  updateVideoDisplayData,
  deleteVideo,
  deleteAllVideos,
  restoreAllVideos,
} from 'app/services/videos';
import { localSave } from 'app/utilities/images';
import ItemsFolderModal from '../itemsFolderModal/ItemsFolderModal';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import IExplorerData from 'app/interfaces/IExplorerData';
import { decreaseFolderItems } from 'app/services/helpers/manageFolders';
import TrashModal from '../../pages/trashed/components/TrashModal';
import classNames from 'classnames';
import styles from './MultiItemsSelect.module.scss';
import { useTranslation } from 'react-i18next';

interface IMultiItemsSelectProps {
  type: MixedItemType;
  items: (IEditorImage | IEditorVideo)[];
  show: boolean;
  resetSelected: React.Dispatch<
    React.SetStateAction<{
      state: boolean;
      items: (IEditorImage | IEditorVideo)[];
    }>
  >;
  screenshots?: IEditorImage[];
  videos?: IEditorVideo[];
  addSelected?: React.Dispatch<
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
  screenshots,
  videos,
  addSelected,
  isTrash,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const { t } = useTranslation();
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
  }, [loader, resetSelected, type]);

  useEffect(() => {
    const mixedItems = screenshots?.concat(videos as any);
    if (type === 'image') {
      if (items.length > 0) {
        addSelected?.({ state: true, items: screenshots } as any);
      }
      if (!selected && items.length <= (screenshots?.length || 0)) {
        resetSelected({ state: false, items: [] });
      }
    }
    if (type === 'video') {
      if (items.length > 0) {
        addSelected?.({ state: true, items: videos } as any);
      }
      if (!selected && items.length <= (videos?.length || 0)) {
        resetSelected({ state: false, items: [] });
      }
    }
    if (type === 'mixed') {
      if (items.length > 0) {
        addSelected?.({ state: true, items: mixedItems } as any);
      }
      if (!selected && items.length <= (mixedItems?.length || 0)) {
        resetSelected({ state: false, items: [] });
      }
    }
  }, [selected]);

  const selectAllHandler = () => {
    setSelected(!selected);
  };

  const onDownloadHandler = async () => {
    const downloadPromises = items.map((item) => {
      if (type === 'image') return localSave(item);
      else if (type === 'video') return downloadVideo(item);
    });

    const s = items.length > 1 ? 's' : '';
    const toast = loadingMessage(`Downloading ${type}${s}...`);

    await Promise.all(downloadPromises);

    const typeUpper = type === 'video' ? 'Video' : 'Image';
    updateMessage(toast, `${typeUpper}${s} downloaded.`, 'success');

    resetSelected({ state: false, items: [] });
  };

  const deleteItemsConfirm = async () => {
    closeAllModals();
    const s = items.length > 1 ? 's' : '';
    const toast = loadingMessage(`Moving ${type}${s} to Trash...`);

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
    updateMessage(toast, `${typeUpper}${s} moved to Trash.`, 'success');
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
      errorMessage('There was a problem, please try again');
      hasError = true;
    } finally {
      setLoader(false);
    }
    if (hasError) return;
    infoMessage('Image deleted successfully');
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
      errorMessage('There was a problem, please try again');
      hasError = true;
    } finally {
      setLoader(false);
    }

    if (hasError) return;

    infoMessage('Video deleted');
  };

  const deleteAllItems = async () => {
    setDeleteModal(false);

    if ((screenshots?.length || 0) === 0 && (videos?.length || 0) === 0) {
      return infoMessage('No items to delete...');
    }

    if ((screenshots?.length || 0) + (videos?.length || 0) === items.length) {
      setLoader(true);
      await deleteAllVideos();
      await deleteAllScreenshots();
      setLoader(false);
      successMessage('Items deleted successfully.');
    } else {
      items.map((item) => {
        if (
          item.dbData?.refName.includes('jpeg') ||
          item.dbData?.refName.includes('jpg') ||
          item.dbData?.refName.includes('png')
        ) {
          return deleteScreenshotConfirm(item);
        } else if (
          item.dbData?.refName.includes('mp4') ||
          item.dbData?.refName.includes('mov') ||
          item.dbData?.refName.includes('avi')
        ) {
          return deleteVideoConfirm(item);
        }
      });
    }
  };

  const restoreAllItems = async () => {
    setRestoreModal(false);

    if (screenshots?.length === 0 && videos?.length === 0) {
      return infoMessage('No items to restore...');
    }

    if ((screenshots?.length || 0) + (videos?.length || 0) === items.length) {
      setLoader(true);
      await restoreAllVideos();
      await restoreAllScreenshots();
      setLoader(false);
      successMessage('Items restored successfully.');
    } else {
      items.map((item) => {
        if (
          item.dbData?.refName.includes('jpeg') ||
          item.dbData?.refName.includes('jpg') ||
          item.dbData?.refName.includes('png')
        ) {
          return restoreFromTrashHandler(item, 'Image');
        } else if (
          item.dbData?.refName.includes('mp4') ||
          item.dbData?.refName.includes('mov') ||
          item.dbData?.refName.includes('avi') ||
          item.dbData?.refName.includes('webm')
        ) {
          return restoreFromTrashHandler(item, 'Video');
        }
      });
      items.length > 1
        ? successMessage(`Items restored successfully.`)
        : successMessage(`Item restored successfully.`);
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
      errorMessage('There was a problem with restoring');
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
        'multi-items tw-flex tw-justify-around tw-items-center tw-bg-gallery-grey tw-rounded-md tw-p-5px tw-px-2 tw-mx-2',
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
              : t('common.bulkActions.selectAll')}
          </div>
        </AppButton>

        {isTrash ? (
          <AppButton
            className="multi-button tw-mx-5px"
            bgColor="tw-bg-white"
            outlined={false}
            onClick={() => setRestoreModal(true)}
          >
            <div className="tw-text-gray-600 tw-leading-6 tw-font-normal tw-fontFamily-roboto">
              {t('common.bulkActions.restore')}
            </div>
          </AppButton>
        ) : (
          <>
            <AppButton
              className="multi-button tw-mx-5px"
              bgColor="tw-bg-white"
              outlined={false}
              onClick={onDownloadHandler}
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
            className="multi-button tw-mx-5px"
            bgColor="tw-bg-white"
            onClick={() => setShowFolderModal(true)}
          >
            <div className="tw-font-normal tw-text-black">
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
