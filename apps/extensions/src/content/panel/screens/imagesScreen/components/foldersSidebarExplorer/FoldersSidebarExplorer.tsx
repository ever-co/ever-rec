import IExplorerData from '@/app/interfaces/IExplorerData';
import {
  createImagesFolder,
  getExplorerData,
} from '@/app/services/screenshots';
import {
  createVideosFolder,
  getExplorerDataVideo,
} from '@/app/services/videos';
import { RootStateOrAny, useSelector } from 'react-redux';
import SidebarFolderItem from '../folderItem/SidebarFolderItem';
import { useState } from 'react';
import CreateFolderModal from '../createFolderModal/CreateFolderModal';
import { IDbFolderData } from '@/app/interfaces/IEditorImage';
import HorizontalDivider from '@/content/panel/components/containers/dashboardLayout/elements/HorizontalDivider';
import useFolderOrder from '../../pages/shared/hooks/useFolderOrder';
import { FolderTypeEnum } from '../../pages/shared/enums/folderTypeEnum';
import { ItemOrderEnum } from '../../pages/shared/enums/itemOrderEnum';
import AppSvg from '@/content/components/elements/AppSvg';
import { useTranslation } from 'react-i18next';

const FoldersSidebarExplorer: React.FC = () => {
  const { t } = useTranslation();
  const explorerData: IExplorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerData,
  );
  const explorerDataVideos: IExplorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerDataVideos,
  );
  const folderType: FolderTypeEnum | null = useSelector(
    (state: RootStateOrAny) => state.panel.folderType,
  );
  const imageFolderOrder: ItemOrderEnum = useSelector(
    (state: RootStateOrAny) => state.panel.screenshotsFolderOrder,
  );
  const videosFolderOrder: ItemOrderEnum = useSelector(
    (state: RootStateOrAny) => state.panel.videosFolderOrder,
  );
  const { folderData: folderImageData } = useFolderOrder(
    explorerData,
    imageFolderOrder,
  );
  const { folderData: folderVideoData } = useFolderOrder(
    explorerDataVideos,
    videosFolderOrder,
  );

  const [modalStateImage, setModalStateImage] = useState<boolean>(false);
  const [modalStateVideo, setModalStateVideo] = useState<boolean>(false);

  const openFolderHandlerImage = (folder: IDbFolderData) => {
    getExplorerData(folder.id);
  };

  const openFolderHandlerVideo = (folder: IDbFolderData) => {
    getExplorerDataVideo(folder.id);
  };

  const createFolderHandler = (name: string, color: string) => {
    const currentFolder = explorerDataVideos?.currentFolder;
    let rootFolderId = currentFolder?.rootFolderId;

    // Is it root folder?
    if (!currentFolder?.parentId && !currentFolder?.rootFolderId) {
      rootFolderId = currentFolder?.id;
    }

    if (folderType === FolderTypeEnum.videoFolders) {
      createVideosFolder(
        explorerDataVideos?.currentFolder?.id || false,
        name,
        color,
        rootFolderId || false,
      );
    } else if (folderType === FolderTypeEnum.imageFolders) {
      createImagesFolder(
        explorerData?.currentFolder?.id || false,
        name,
        color,
        rootFolderId || false,
      );
    }

    closeModal();
  };

  const openModal = () => {
    if (folderType === FolderTypeEnum.imageFolders) {
      setModalStateImage(true);
    } else if (folderType === FolderTypeEnum.videoFolders) {
      setModalStateVideo(true);
    }
  };

  const closeModal = () => {
    if (folderType === FolderTypeEnum.imageFolders) {
      setModalStateImage(false);
    } else if (folderType === FolderTypeEnum.videoFolders) {
      setModalStateVideo(false);
    }
  };

  return (
    <>
      {folderImageData &&
        folderType == FolderTypeEnum.imageFolders &&
        folderImageData?.length > 0 && (
          <>
            <HorizontalDivider className="tw-my-5 tw-opacity-50" />
            <div>
              <div className="tw-flex tw-justify-between tw-items-center">
                <h3 className="tw-font-semibold tw-pl-3">
                  {t('unique.imageFolders')}
                </h3>
                <div onClick={openModal}>
                  <AppSvg
                    path="images/panel/common/add_new.svg"
                    className="tw-cursor-pointer"
                  />
                </div>
              </div>
              <div className="tw-mt-4 scroll-div tw-overflow-auto tw-max-h-200px">
                {folderImageData &&
                  folderImageData.map((folder, index) => (
                    <SidebarFolderItem
                      key={`folder_${index}`}
                      title={folder.name}
                      color={folder.color ? folder.color : '#7737FF'}
                      onClick={() => openFolderHandlerImage(folder)}
                    />
                  ))}
              </div>
              <CreateFolderModal
                visible={modalStateImage}
                onClose={closeModal}
                onCreateFolder={createFolderHandler}
              />
            </div>
          </>
        )}
      {folderVideoData &&
        folderType == FolderTypeEnum.videoFolders &&
        folderVideoData?.length > 0 && (
          <>
            <HorizontalDivider className="tw-my-5 tw-opacity-50" />
            <div>
              <div className="tw-flex tw-justify-between tw-items-center">
                <h3 className="tw-font-semibold tw-pl-3">
                  {' '}
                  {t('unique.videoFolders')}
                </h3>
                <div onClick={openModal}>
                  <AppSvg
                    path="images/panel/common/add_new.svg"
                    className="tw-cursor-pointer"
                  />
                </div>
              </div>
              <div className="tw-mt-4 scroll-div tw-overflow-auto tw-max-h-200px">
                {folderVideoData &&
                  folderVideoData.map((folder, index) => (
                    <SidebarFolderItem
                      key={`folder_${index}`}
                      title={folder.name}
                      color={folder.color ? folder.color : '#7737FF'}
                      onClick={() => openFolderHandlerVideo(folder)}
                    />
                  ))}
              </div>
              <CreateFolderModal
                visible={modalStateVideo}
                onClose={closeModal}
                onCreateFolder={createFolderHandler}
              />
            </div>
          </>
        )}
    </>
  );
};

export default FoldersSidebarExplorer;
