import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import IEditorImage, { DbImgData } from '@/app/interfaces/IEditorImage';
import AppButton from '@/content/components/controls/appButton/AppButton';
import IExplorerData from '@/app/interfaces/IExplorerData';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import {
  getExplorerData,
  updateFolderData,
  updateImageData,
} from '@/app/services/screenshots';
import {
  getExplorerDataVideo,
  updateVideoData,
  updateVideoFolderData,
} from '@/app/services/videos';
import { infoMessage } from '@/app/services/helpers/toastMessages';
import IEditorVideo, {
  DbFolderData,
  DbVideoData,
} from '@/app/interfaces/IEditorVideo';
import { MixedItemType } from '@/app/interfaces/ItemTypes';
import FolderSection from './components/FolderSection';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import AppSvg from '@/content/components/elements/AppSvg';
import { getFilesImageAPI } from '@/app/services/api/image';
import { getVideoFilesAPI } from '@/app/services/api/video';
import {
  decreaseFolderItems,
  increaseFolderItems,
} from '@/app/services/helpers/manageFolders';

interface IItemsFolderModalProps {
  mainItem?: IEditorImage | IEditorVideo | null;
  items?: IEditorImage[] | IEditorVideo[];
  visible: boolean;
  onCancel: () => void;
  type: MixedItemType;
  loader: React.Dispatch<React.SetStateAction<boolean>>;
}

const ItemsFolderModal: React.FC<IItemsFolderModalProps> = ({
  onCancel,
  visible,
  mainItem,
  items,
  type,
  loader,
}) => {
  const explorerDataImages: IExplorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerData,
  );
  const explorerDataVideos: IExplorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerDataVideos,
  );
  const [selectedFolder, setSelectedFolder] = useState<DbFolderData | false>(
    false,
  );
  const [valid, setValid] = useState(false);
  const [initialOpened, setInitialOpened] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    visible && setInitialOpened(true);
  }, [visible]);

  const moveSingleHandler = async () => {
    if (mainItem?.dbData) {
      onCancel();
      setInitialOpened(false);
      loader(true);
      const dbData = {
        ...mainItem.dbData,
        parentId: (selectedFolder && selectedFolder.id) || false,
      };
      if (type == 'image') {
        if (mainItem) {
          if (explorerDataImages.currentFolder) {
            await decreaseFolderItems(
              explorerDataImages.currentFolder,
              'image',
              1,
            );
          }

          if (selectedFolder) {
            await increaseFolderItems(selectedFolder, 'image', 1);
          }

          const image = await updateImageData(dbData as DbImgData);
          image && dispatch(PanelAC.setEditorImage({ editorImage: image }));
        }
        await getExplorerData(explorerDataImages.currentFolder?.id);
        infoMessage(
          `Image moved to ${
            (selectedFolder && selectedFolder.name) || 'My Images'
          }`,
        );
      } else if (type == 'video') {
        if (mainItem) {
          if (explorerDataVideos.currentFolder) {
            await decreaseFolderItems(
              explorerDataVideos.currentFolder,
              'video',
              1,
            );
          }

          if (selectedFolder) {
            await increaseFolderItems(selectedFolder, 'video', 1);
          }

          const video = await updateVideoData(dbData as DbVideoData);
          video && dispatch(PanelAC.setEditorVideo({ editorVideo: video }));
        }
        mainItem && (await updateVideoData(dbData as DbVideoData));
        await getExplorerDataVideo(explorerDataImages.currentFolder?.id);
        infoMessage(
          `Video moved to ${
            (selectedFolder && selectedFolder.name) || 'My Videos'
          }`,
        );
      }
      loader(false);
    }
  };

  const moveSelectedHandler = async () => {
    if (items && loader) {
      onCancel();
      setInitialOpened(false);
      loader(true);
      await Promise.allSettled(
        items.map(async (item, index) => {
          if (item && item.dbData) {
            const dbData = {
              ...item.dbData,
              parentId: (selectedFolder && selectedFolder?.id) || false,
            };
            if (type == 'image') {
              item && (await updateImageData(dbData));
              await getExplorerData(explorerDataImages.currentFolder?.id);
            } else if (type == 'video') {
              item && (await updateVideoData(dbData));
              await getExplorerDataVideo(explorerDataImages.currentFolder?.id);
            }
            if (items.length == index + 1) {
              loader(false);
            }
          }
        }),
      );
      if (type == 'image') {
        if (explorerDataImages.currentFolder) {
          await decreaseFolderItems(
            explorerDataImages.currentFolder,
            'image',
            items.length,
          );
        }

        if (selectedFolder) {
          await increaseFolderItems(selectedFolder, 'image', items.length);
        }
      } else if (type == 'video') {
        if (explorerDataVideos.currentFolder) {
          await decreaseFolderItems(
            explorerDataVideos.currentFolder,
            'video',
            items.length,
          );
        }

        if (selectedFolder) {
          await increaseFolderItems(selectedFolder, 'video', items.length);
        }
      }
    }
  };

  const moveHandler = mainItem ? moveSingleHandler : moveSelectedHandler;

  useEffect(() => {
    if (mainItem) {
      if (selectedFolder) {
        setValid(selectedFolder?.id !== mainItem.dbData?.parentId);
      } else {
        setValid(mainItem?.dbData?.parentId !== false);
      }
    } else {
      type === 'image'
        ? setValid(
            (selectedFolder && selectedFolder?.id) !==
              explorerDataImages.currentFolder?.id,
          )
        : setValid(
            (selectedFolder && selectedFolder?.id) !==
              explorerDataVideos.currentFolder?.id,
          );
    }
  }, [explorerDataImages, explorerDataVideos, selectedFolder, type, mainItem]);

  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      closeIcon={
        <AppSvg
          path="images/panel/common/close-icon.svg"
          className="modalCloseButton"
        />
      }
      footer={
        <div className="tw-flex tw-justify-end tw-mt-14">
          <AppButton
            onClick={moveHandler}
            className="tw-px-8 tw-pb-1 tw-pt-1"
            disabled={!valid}
          >
            Move
          </AppButton>
          <AppButton
            onClick={() => {
              setInitialOpened(false);
              onCancel();
            }}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            Cancel
          </AppButton>
        </div>
      }
    >
      {type === 'image' ? (
        <FolderSection
          explorerData={explorerDataImages}
          item={mainItem || null}
          initialOpened={initialOpened}
          setSelectedFolder={setSelectedFolder}
          itemType="image"
        />
      ) : (
        <FolderSection
          explorerData={explorerDataVideos}
          item={mainItem || null}
          initialOpened={initialOpened}
          setSelectedFolder={setSelectedFolder}
          itemType="video"
        />
      )}
    </Modal>
  );
};

export default ItemsFolderModal;
