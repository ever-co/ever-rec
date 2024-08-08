import React, { FC } from 'react';
import { IDbFolderData } from '@/app/interfaces/IEditorImage';
import AppSvg from '@/content/components/elements/AppSvg';

interface IFoldersProps {
  folders: IDbFolderData[];
  goToMainFolder: () => void;
  goToFolder: (arg: IDbFolderData) => void;
}

const FolderHistory: FC<IFoldersProps> = ({
  folders,
  goToMainFolder,
  goToFolder,
}) => {
  if (folders.length === 0) return null;

  const folderElements = folders.map((folder, index, { length }) => {
    const isLastFolder = length - 1 === index;

    return (
      <div className="tw-flex tw-items-center" key={folder.id}>
        <h1
          className="tw-font-semibold tw-cursor-pointer"
          onClick={() => goToFolder(folder)}
        >
          {folder.name}
        </h1>
        {!isLastFolder && (
          <AppSvg
            path="images/panel/common/Chevron_right.svg"
            size="20px"
            className="tw-mx-1"
          />
        )}
      </div>
    );
  });

  return (
    <div className="tw-flex tw-items-center tw-flex-wrap">
      <h1
        className="tw-font-semibold tw-text-app-grey-darker tw-cursor-pointer"
        onClick={goToMainFolder}
      >
        My Items
      </h1>
      <AppSvg
        path="images/panel/common/Chevron_right.svg"
        size="20px"
        className="tw-mx-1"
      />
      {folderElements}
    </div>
  );
};

export default FolderHistory;
