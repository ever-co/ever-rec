import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import IEditorImage, { DbImgData } from 'app/interfaces/IEditorImage';
import AppButton from 'components/controls/AppButton';
import IExplorerData from 'app/interfaces/IExplorerData';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { getExplorerData, updateImageData } from 'app/services/screenshots';
import { getExplorerDataVideo, updateVideoData } from 'app/services/videos';
import { infoMessage } from 'app/services/helpers/toastMessages';
import IEditorVideo, {
  DbVideoData,
  IDbFolderData,
} from 'app/interfaces/IEditorVideo';
import { MixedItemType } from 'app/interfaces/ItemType';
import FolderSection from './FolderSection';
import PanelAC from '../../../../../store/panel/actions/PanelAC';
import AppSvg from '../../../../elements/AppSvg';
import {
  decreaseFolderItems,
  increaseFolderItems,
} from 'app/services/helpers/manageFolders';

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
  const [selectedFolder, setSelectedFolder] = useState<IDbFolderData | null>(
    null,
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
      loader && loader(true);
      const dbData = {
        ...mainItem.dbData,
        parentId: selectedFolder?.id || false,
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
          dispatch(PanelAC.setEditorImage({ editorImage: image as any }));
        }
        await getExplorerData(explorerDataImages.currentFolder?.id);
        infoMessage(`Image moved to ${selectedFolder?.name || 'My Images'}`);
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
          dispatch(PanelAC.setEditorVideo({ editorVideo: video as any }));
        }
        mainItem && (await updateVideoData(dbData as DbVideoData));
        await getExplorerDataVideo(explorerDataImages.currentFolder?.id);
        infoMessage(`Video moved to ${selectedFolder?.name || 'My Videos'}`);
      }
      loader && loader(false);
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
              parentId: selectedFolder?.id || false,
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
        ? setValid(selectedFolder?.id !== explorerDataImages.currentFolder?.id)
        : setValid(selectedFolder?.id !== explorerDataVideos.currentFolder?.id);
    }
  }, [explorerDataImages, explorerDataVideos, selectedFolder, type, mainItem]);

  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      closeIcon={
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
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
          item={mainItem as any}
          initialOpened={initialOpened}
          setSelectedFolder={setSelectedFolder}
          itemType="image"
        />
      ) : (
        <FolderSection
          explorerData={explorerDataVideos}
          item={mainItem as any}
          initialOpened={initialOpened}
          setSelectedFolder={setSelectedFolder}
          itemType="video"
        />
      )}
    </Modal>
  );
};

export default ItemsFolderModal;
