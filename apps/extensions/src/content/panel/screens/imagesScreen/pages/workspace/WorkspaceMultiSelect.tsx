import React, { useState } from 'react';
import styles from '@/content/panel/screens/imagesScreen/components/multiItemsSelect/MultiItemsSelect.module.scss';
import classNames from 'classnames';
import store from '@/app/store/panel';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import {
  IWorkspace,
  IWorkspaceImage,
  IWorkspaceSelectItemsState,
  IWorkspaceVideo,
} from '@/app/interfaces/IWorkspace';
import {
  loadingMessage,
  updateMessage,
} from '@/app/services/helpers/toastMessages';
import { downloadVideo } from '@/app/services/videos';
import {
  deleteWorkspaceImage,
  deleteWorkspaceVideo,
} from '@/app/services/workspace';
import { localSave } from '@/app/utilities/images';
import AppButton from '@/content/components/controls/appButton/AppButton';
import DeleteMultiItemsModal from '../../components/deleteMultiItems/DeleteMultiItemsModal';
import WorkspaceItemsFolderModal from './WorkspaceItemsFolderModal';

interface Props {
  workspace: IWorkspace | null;
  allItems: (IWorkspaceImage | IWorkspaceVideo)[];
  selectedItems: (IWorkspaceImage | IWorkspaceVideo)[];
  show: boolean;
  setSelectState: React.Dispatch<
    React.SetStateAction<IWorkspaceSelectItemsState>
  >;
}
const WorkspaceMultiSelect: React.FC<Props> = ({
  workspace,
  allItems,
  selectedItems,
  show,
  setSelectState,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const areAllSelected = selectedItems.length === allItems.length;

  const closeAllModals = () => {
    setShowDeleteModal(false);
    setShowFolderModal(false);
  };

  const selectAllHandler = () => {
    areAllSelected
      ? setSelectState({ state: false, items: [] })
      : setSelectState({ state: true, items: allItems });
  };

  const onDownloadHandler = async () => {
    const downloadPromises = selectedItems.map(async (item) => {
      const itemType = item.ref.contentType.split('/')[0];

      if (itemType === 'image') {
        return localSave(item);
      } else if (itemType === 'video') {
        return downloadVideo(item);
      }
    });

    const toast = loadingMessage('Downloading items...');

    await Promise.all(downloadPromises);

    updateMessage(toast, 'Items downloaded.', 'success');

    setSelectState({ state: false, items: [] });
  };

  const deleteItemsConfirm = async () => {
    closeAllModals();
    if (!workspace) return;

    const deletedItemIds: string[] = [];
    const deletePromises = selectedItems.map((item) => {
      const type = item.ref.contentType.split('/')[0];
      const id = item?.dbData?.id;
      const refName = item?.dbData?.refName;
      const parentId = item?.dbData?.parentId || false;

      if (type === 'image') {
        deletedItemIds.push(id);
        return deleteWorkspaceImage(workspace.id, id, refName, parentId);
      } else if (type === 'video') {
        deletedItemIds.push(id);
        return deleteWorkspaceVideo(workspace.id, id, refName);
      }
    });

    const toast = loadingMessage(`Deleting Items...`);

    await Promise.all(deletePromises);

    const newScreenshots = (workspace?.screenshots || []).filter(
      (screenshot: IWorkspaceImage) =>
        !deletedItemIds.includes(screenshot.dbData.id),
    );
    const newVideos = (workspace?.videos || []).filter(
      (video: IWorkspaceVideo) => !deletedItemIds.includes(video.dbData.id),
    );

    const newWorkspace: IWorkspace = {
      ...workspace,
      screenshots: newScreenshots,
      videos: newVideos,
    };

    store.dispatch(
      PanelAC.setActiveWorkspace({ activeWorkspace: newWorkspace }),
    );

    updateMessage(toast, `Items deleted.`, 'success');

    // TODO change folder item count
    // const currentFolder =
    //   type === 'video'
    //     ? explorerDataVideos.currentFolder
    //     : explorerDataImages.currentFolder;
    // if (currentFolder) {
    //   await decreaseFolderItems(currentFolder, type, items.length);
    // }

    setSelectState({ state: false, items: [] });
  };

  if (!show) return null;

  return (
    <div
      className={classNames(
        'tw-flex tw-flex tw-justify-around tw-items-center tw-bg-gallery-grey tw-rounded-md tw-p-5px tw-px-2',
        styles.workspace,
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
            {areAllSelected ? 'Select none' : 'Select all'}
          </div>
        </AppButton>

        <AppButton
          onClick={onDownloadHandler}
          className="multi-button tw-mx-5px"
          bgColor="tw-bg-white"
          outlined={false}
        >
          <div className="tw-text-gray-600 tw-leading-6 tw-font-normal tw-fontFamily-roboto">
            Download
          </div>
        </AppButton>
      </div>

      <div className="tw-flex">
        <AppButton
          onClick={() => setShowFolderModal(true)}
          className="multi-button tw-mx-5px"
          bgColor="tw-bg-white"
        >
          <div className="tw-font-normal tw-text-black">Move</div>
        </AppButton>

        <AppButton
          onClick={() => setShowDeleteModal(true)}
          className="multi-button tw-mx-5px"
          bgColor="tw-bg-white"
          outlined={false}
        >
          <div className="tw-text-red tw-leading-6 tw-font-normal tw-fontFamily-roboto">
            Delete
          </div>
        </AppButton>
      </div>

      <WorkspaceItemsFolderModal
        items={selectedItems}
        visible={showFolderModal}
        onCancel={closeAllModals}
        setSelectedState={setSelectState}
      />
      <DeleteMultiItemsModal
        visible={showDeleteModal}
        type="item"
        onClose={closeAllModals}
        onOkHandler={deleteItemsConfirm}
      />
    </div>
  );
};

export default WorkspaceMultiSelect;
