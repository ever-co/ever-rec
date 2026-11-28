import React, { FC } from 'react';
import { IDbFolderData } from 'app/interfaces/IEditorImage';
import AppSvg from 'components/elements/AppSvg';
import { useTranslation } from 'react-i18next';

interface IFoldersProps {
  folders: IDbFolderData[];
  goToMainFolder: () => void;
  goToFolder: (arg: IDbFolderData) => void;
}

// TODO: refactor - remove tailwindCSS, improve styling
const FolderHistory: FC<IFoldersProps> = ({
  folders,
  goToMainFolder,
  goToFolder,
}) => {
  const { t } = useTranslation();
  if (folders.length === 0) return null;

  const folderElements = folders.map((folder, index, { length }) => {
    const isLastFolder = length - 1 === index;

    return (
      <div className="tw-flex tw-items-center" key={folder.id}>
        <h1
          className={
            isLastFolder
              ? 'tw-font-semibold tw-cursor-pointer tw-text-foreground'
              : 'tw-font-semibold tw-cursor-pointer tw-text-muted-foreground tw-transition-colors tw-duration-150 hover:tw-text-foreground'
          }
          onClick={() => goToFolder(folder)}
        >
          {folder.name}
        </h1>
        {!isLastFolder && (
          <AppSvg
            path="/common/Chevron_right.svg"
            size="20px"
            className="tw-mx-1 tw-text-muted-foreground rtl:-tw-scale-x-100"
          />
        )}
      </div>
    );
  });

  // The trail stands where the page title stands: same size, the open folder in the text colour
  // and the way back to it quiet.
  return (
    <div className="tw-flex tw-items-center tw-flex-wrap tw-text-2xl tw-leading-8 tw-tracking-[-0.01em]">
      <h1
        className="tw-font-semibold tw-cursor-pointer tw-text-muted-foreground tw-transition-colors tw-duration-150 hover:tw-text-foreground"
        onClick={goToMainFolder}
      >
        {t('unique.myItems')}
      </h1>
      <AppSvg
        path="/common/Chevron_right.svg"
        size="20px"
        className="tw-mx-1 tw-text-muted-foreground rtl:-tw-scale-x-100"
      />
      {folderElements}
    </div>
  );
};

export default FolderHistory;
