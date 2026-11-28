import { FC } from 'react';
import { IDbFolderData } from 'app/interfaces/IEditorImage';
import FolderHistory from './FolderHistory';
import AppSvg from 'components/elements/AppSvg';

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
    <div className="tw-flex tw-items-center tw-gap-x-2 tw-px-4 tw-pt-6 md:tw-px-6 xl:tw-px-8">
      <div
        onClick={goToParentFolder}
        className="-tw-ms-1.5 tw-flex tw-size-8 tw-shrink-0 tw-cursor-pointer tw-items-center tw-justify-center tw-rounded-md tw-text-muted-foreground tw-transition-colors tw-duration-150 hover:tw-bg-accent hover:tw-text-foreground"
      >
        <AppSvg
          path="/common/arrow_back-light.svg"
          className="tw-cursor-pointer rtl:-tw-scale-x-100"
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
