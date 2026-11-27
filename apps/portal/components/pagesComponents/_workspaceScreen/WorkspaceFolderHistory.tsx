import { FC, useEffect, useState } from 'react';
import AppSvg from 'components/elements/AppSvg';
import { IWorkspaceDbFolder } from 'app/interfaces/IWorkspace';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';

interface IFoldersProps {
  folders: IWorkspaceDbFolder[];
  currentWorkspaceFolder: IWorkspaceDbFolder;
}

const WorkspaceFolderHistory: FC<IFoldersProps> = ({
  folders,
  currentWorkspaceFolder,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [navigationFolders, setNavigationFolders] = useState<
    IWorkspaceDbFolder[] | null
  >(null);

  useEffect(() => {
    if (folders && currentWorkspaceFolder) {
      const recursionFolders = recursiveFolderNavBuild(
        folders,
        currentWorkspaceFolder.parentId,
        [currentWorkspaceFolder],
      );
      setNavigationFolders(recursionFolders);
    }
  }, [folders, currentWorkspaceFolder]);

  const recursiveFolderNavBuild = (
    folders: IWorkspaceDbFolder[],
    parentId: string | false,
    tempFolders?: IWorkspaceDbFolder[],
  ) => {
    const result = tempFolders || [];
    if (parentId !== false) {
      const parentFolder = folders?.find((x) => x.id === parentId);
      parentFolder && result.unshift(parentFolder);
      return recursiveFolderNavBuild(
        folders,
        parentFolder?.parentId as string,
        result,
      );
    } else {
      return result;
    }
  };

  if (!navigationFolders || navigationFolders?.length === 0) return null;

  const switchFolder = (folderId: string | undefined) => {
    const params = new URLSearchParams({
      ...router.query,
      folder: folderId,
    } as any);
    !folderId && params.delete('folder');
    router.push({ query: params.toString() });
  };

  // The trail stands where the page title stands: same size, the open folder in the text colour
  // and the way back to it quiet.
  return (
    navigationFolders && (
      <div className="tw-flex tw-min-w-0 tw-items-center tw-gap-x-2">
        <div
          onClick={() => switchFolder(undefined)}
          className="-tw-ml-1.5 tw-flex tw-size-8 tw-shrink-0 tw-cursor-pointer tw-items-center tw-justify-center tw-rounded-md tw-text-muted-foreground tw-transition-colors tw-duration-150 hover:tw-bg-accent hover:tw-text-foreground"
        >
          <AppSvg
            path="/common/arrow_back-light.svg"
            className="tw-cursor-pointer"
            size="20px"
          />
        </div>
        <div className="tw-flex tw-min-w-0 tw-items-center tw-flex-wrap tw-text-2xl tw-leading-8 tw-tracking-[-0.01em]">
          <h1
            className="tw-font-semibold tw-cursor-pointer tw-text-muted-foreground tw-transition-colors tw-duration-150 hover:tw-text-foreground"
            onClick={() => switchFolder(undefined)}
          >
            {t('page.video.library')}
          </h1>
          <AppSvg
            path="/common/Chevron_right.svg"
            size="20px"
            className="tw-mx-1 tw-text-muted-foreground"
          />
          {navigationFolders?.map((folder, index, { length }) => {
            const isLastFolder = length - 1 === index;

            return (
              <div className="tw-flex tw-items-center" key={folder?.id}>
                <h1
                  className={
                    isLastFolder
                      ? 'tw-font-semibold tw-cursor-pointer tw-text-foreground'
                      : 'tw-font-semibold tw-cursor-pointer tw-text-muted-foreground tw-transition-colors tw-duration-150 hover:tw-text-foreground'
                  }
                  onClick={() => switchFolder(folder?.id)}
                >
                  {folder?.name}
                </h1>
                {!isLastFolder && (
                  <AppSvg
                    path="/common/Chevron_right.svg"
                    size="20px"
                    className="tw-mx-1 tw-text-muted-foreground"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    )
  );
};

export default WorkspaceFolderHistory;
