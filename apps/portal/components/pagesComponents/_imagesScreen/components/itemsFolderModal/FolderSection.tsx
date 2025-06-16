import IEditorImage, { IDbFolderData } from 'app/interfaces/IEditorImage';
import IExplorerData from 'app/interfaces/IExplorerData';
import IEditorVideo from '../../../../../app/interfaces/IEditorVideo';
import { useEffect, useState } from 'react';
import Folder from './Folder';
import { useTranslation } from 'react-i18next';

const sortFolders = (a: IDbFolderData, b: IDbFolderData) => {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
};

interface IFolderSectionProps {
  explorerData: IExplorerData;
  item: IEditorImage | IEditorVideo;
  itemType: 'image' | 'video';
  initialOpened: boolean;
  setSelectedFolder: (folder: IDbFolderData) => void;
}

const FolderSection: React.FC<IFolderSectionProps> = ({
  explorerData,
  item,
  itemType,
  initialOpened,
  setSelectedFolder,
}) => {
  const [highlightedRef, setHighlightedRef] =
    useState<React.Ref<HTMLDivElement>>(null);

  const { t } = useTranslation();
  useEffect(() => {
    initialOpened && setHighlightedRef(null);
  }, [initialOpened]);

  const buildFolderTree = (folders: IDbFolderData[], leftMargin = 70) => {
    return folders.sort(sortFolders).map((folder) => {
      return (
        <Folder
          key={folder.id}
          folder={folder}
          highlightedRef={highlightedRef}
          setSelectedFolder={setSelectedFolder}
          leftMargin={leftMargin}
          setHighlightedRef={setHighlightedRef}
        >
          {folder.children && buildFolderTree(folder.children, leftMargin + 70)}
        </Folder>
      );
    });
  };

  let folderSection: JSX.Element;
  if (explorerData.allFolders.length > 0) {
    folderSection = (
      <>
        <h2 className="tw-mb-6 tw-text-2xl tw-font-semibold">
          {t('page.image.selectFolder')}
        </h2>
        <Folder
          folder={null as any}
          leftMargin={0}
          RootFolderName={
            itemType === 'image' ? t('common.myImages') : t('common.myVideos')
          }
          highlightedRef={highlightedRef}
          setHighlightedRef={setHighlightedRef}
          setSelectedFolder={() => setSelectedFolder(null as any)}
        />
        {initialOpened && buildFolderTree(explorerData.allFolders)}
      </>
    );
  } else if (item?.dbData?.parentId === false) {
    folderSection = (
      <>
        <h3 className="tw-mb-6 tw-text-2xl tw-font-semibold">
          {t('common.donthaveFolder')}
        </h3>
      </>
    );
  } else {
    return (
      <Folder
        folder={null as any}
        leftMargin={0}
        RootFolderName={
          itemType === 'image' ? t('common.myImages') : t('common.myVideos')
        }
        highlightedRef={highlightedRef}
        setHighlightedRef={setHighlightedRef}
        setSelectedFolder={() => setSelectedFolder(null as any)}
      />
    );
  }

  return <>{folderSection}</>;
};

export default FolderSection;
