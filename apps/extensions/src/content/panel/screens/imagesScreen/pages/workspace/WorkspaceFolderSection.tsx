import React, { useEffect, useState } from 'react';
import IEditorVideo from '@/app/interfaces/IEditorVideo';
import IEditorImage from '@/app/interfaces/IEditorImage';
import {
  IWorkspaceDbFolder,
  IWorkspaceVideo,
  IWorkspaceImage,
  IWorkspace,
} from '@/app/interfaces/IWorkspace';
import Folder from '../../components/folderItem/Folder';
import { useTranslation } from 'react-i18next';

const sortFolders = (a: IWorkspaceDbFolder, b: IWorkspaceDbFolder) => {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
};

interface IFolderSectionProps {
  folders: IWorkspaceDbFolder[];
  items: (IWorkspaceImage | IWorkspaceVideo | IEditorImage | IEditorVideo)[];
  workspace: IWorkspace;
  initialOpened: boolean;
  setSelectedFolder: React.Dispatch<
    React.SetStateAction<IWorkspaceDbFolder | null>
  >;
}

const WorkspaceFolderSection: React.FC<IFolderSectionProps> = ({
  folders,
  items,
  workspace,
  initialOpened,
  setSelectedFolder,
}) => {
  const { t } = useTranslation();
  let folderSection: JSX.Element;
  const [highlightedRef, setHighlightedRef] =
    useState<React.Ref<HTMLDivElement>>(null);

  useEffect(() => {
    initialOpened && setHighlightedRef(null);
  }, [initialOpened]);

  const buildFolderTree = (
    folders: IWorkspaceDbFolder[],
    leftMargin = 70,
    initial = true,
  ) => {
    const workFolders = initial
      ? folders.filter((x) => x.parentId === false)
      : folders;

    return workFolders?.sort(sortFolders).map((folder) => {
      const folderChildren = folders.filter((x) => x.parentId === folder.id);
      return (
        <Folder
          key={folder.id}
          folder={folder}
          leftMargin={leftMargin}
          highlightedRef={highlightedRef}
          setHighlightedRef={setHighlightedRef}
          setSelectedFolder={setSelectedFolder as any}
        >
          {folderChildren &&
            buildFolderTree(folderChildren, leftMargin + 70, false)}
        </Folder>
      );
    });
  };

  if (folders?.length > 0) {
    folderSection = (
      <>
        <h2 className="tw-mb-6 tw-text-2xl tw-font-semibold">
          {' '}
          {t('modals.selectFolder')}
        </h2>
        <Folder
          folder={null}
          leftMargin={0}
          RootFolderName={workspace.name}
          highlightedRef={highlightedRef}
          setHighlightedRef={setHighlightedRef}
          setSelectedFolder={() => setSelectedFolder(null)}
        />
        {initialOpened && buildFolderTree(folders)}
      </>
    );
  } else if (items.every((x) => x.dbData?.parentId === false)) {
    folderSection = (
      <>
        <h3 className="tw-mb-6 tw-text-2xl tw-font-semibold">
          {t('common.donthaveFolder')}{' '}
        </h3>
      </>
    );
  } else {
    return (
      <Folder
        folder={null}
        leftMargin={0}
        highlightedRef={highlightedRef}
        setHighlightedRef={setHighlightedRef}
        setSelectedFolder={() => setSelectedFolder(null)}
      />
    );
  }

  return folderSection;
};

export default WorkspaceFolderSection;
