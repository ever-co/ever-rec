import IEditorImage from 'app/interfaces/IEditorImage';
import IEditorVideo from '../../../../../app/interfaces/IEditorVideo';
import { useEffect, useState } from 'react';
import Folder from './Folder';
import {
  IWorkspace,
  IWorkspaceDbFolder,
  IWorkspaceImage,
  IWorkspaceVideo,
} from 'app/interfaces/IWorkspace';

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
  setSelectedFolder: React.Dispatch<React.SetStateAction<IWorkspaceDbFolder>>;
}

const WorkspaceFolderSection: React.FC<IFolderSectionProps> = ({
  folders,
  items,
  workspace,
  initialOpened,
  setSelectedFolder,
}) => {
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
          setSelectedFolder={setSelectedFolder}
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
        <h2 className="tw-mb-6 tw-text-2xl tw-font-semibold">Select folder</h2>
        <Folder
          folder={null as any}
          leftMargin={0}
          RootFolderName={workspace.name}
          highlightedRef={highlightedRef}
          setHighlightedRef={setHighlightedRef}
          setSelectedFolder={() => setSelectedFolder(null as any)}
        />
        {initialOpened && buildFolderTree(folders)}
      </>
    );
  } else if (items.every((x) => x.dbData?.parentId === false)) {
    folderSection = (
      <>
        <h3 className="tw-mb-6 tw-text-2xl tw-font-semibold">
          You don&apos;t have any folders!
        </h3>
      </>
    );
  } else {
    return (
      <Folder
        folder={null as any}
        leftMargin={0}
        highlightedRef={highlightedRef}
        setHighlightedRef={setHighlightedRef}
        setSelectedFolder={() => setSelectedFolder(null as any)}
      />
    );
  }

  return folderSection;
};

export default WorkspaceFolderSection;
