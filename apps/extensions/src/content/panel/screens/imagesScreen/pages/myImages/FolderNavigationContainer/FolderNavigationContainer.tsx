import React, { FC } from 'react';
import { IDbFolderData } from '@/app/interfaces/IEditorImage';
import FolderHistory from './FolderHistory/FolderHistory';
import AppSvg from '@/content/components/elements/AppSvg';

interface IFolderHistoryContainerProps {
  folderHistory: IDbFolderData[];
  goToParentFolder: () => void;
  goToMainFolder: () => void;
  goToFolder: (arg: IDbFolderData) => void;
}

const FolderNavigationContainer: FC<IFolderHistoryContainerProps> = ({
  folderHistory,
  goToParentFolder,
  goToMainFolder,
  goToFolder,
}) => {
  return (
    <div className="tw-flex tw-items-center tw-gap-x-2 tw-px-8 tw-py-4">
      <div onClick={goToParentFolder} className="tw-flex flex-shrink-0">
        <AppSvg
          path="images/panel/common/arrow_back-light.svg"
          className="tw-cursor-pointer"
          size="20px"
        />
      </div>
      <FolderHistory
        folders={folderHistory}
        goToMainFolder={goToMainFolder}
        goToFolder={goToFolder}
      />
    </div>
  );
};

export default FolderNavigationContainer;
