import { FC, useEffect, useState } from 'react';
import AppSvg from '@/content/components/elements/AppSvg';
import { IWorkspaceDbFolder } from '@/app/interfaces/IWorkspace';
import { useNavigate } from 'react-router';
import { useSearchParams } from 'react-router-dom';

interface IFoldersProps {
  folders: IWorkspaceDbFolder[];
  currentWorkspaceFolder: IWorkspaceDbFolder;
}

const WorkspaceFolderHistory: FC<IFoldersProps> = ({
  folders,
  currentWorkspaceFolder,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [navigationFolders, setNavigationFolders] = useState<
    IWorkspaceDbFolder[] | null
  >(null);

  useEffect(() => {
    if (folders && currentWorkspaceFolder) {
      const recursionFolders = recursiveFolderNavBuild(
        folders,
        currentWorkspaceFolder?.parentId,
        [currentWorkspaceFolder],
      );
      setNavigationFolders(recursionFolders);
    }
  }, [folders, currentWorkspaceFolder]);

  const recursiveFolderNavBuild: any = (
    folders: IWorkspaceDbFolder[],
    parentId: string | false,
    tempFolders?: IWorkspaceDbFolder[],
  ) => {
    const result = tempFolders || [];
    if (parentId !== false) {
      const parentFolder = folders?.find((x) => x.id === parentId);
      if (parentFolder) {
        result.unshift(parentFolder);
        return recursiveFolderNavBuild(folders, parentFolder?.parentId, result);
      }
    } else {
      return result;
    }
  };

  if (!navigationFolders || navigationFolders?.length === 0) return null;
  const switchFolder = (folderId: string | undefined) => {
    if (folderId) {
      searchParams.set('folder', folderId);
    } else {
      searchParams.delete('folder');
    }
    setSearchParams(searchParams);
  };

  return (
    navigationFolders && (
      <div className="tw-flex tw-items-center tw-gap-x-2">
        <div
          onClick={() => switchFolder(undefined)}
          className="tw-flex flex-shrink-0"
        >
          <AppSvg
            path="images/panel/common/arrow_back-light.svg"
            className="tw-cursor-pointer"
            size="20px"
          />
        </div>
        <div className="tw-flex tw-items-center tw-flex-wrap">
          <h1
            className="tw-text-lg tw-font-semibold tw-text-app-grey-darker tw-cursor-pointer"
            onClick={() => switchFolder(undefined)}
          >
            Library
          </h1>
          <AppSvg
            path="images/panel/common/Chevron_right.svg"
            size="20px"
            className="tw-mx-1"
          />
          {navigationFolders?.map((folder, index, { length }) => {
            const isLastFolder = length - 1 === index;

            return (
              <div className="tw-flex tw-items-center" key={folder?.id}>
                <h1
                  className="tw-font-semibold tw-cursor-pointer"
                  onClick={() => switchFolder(folder?.id)}
                >
                  {folder?.name}
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
          })}
        </div>
      </div>
    )
  );
};

export default WorkspaceFolderHistory;
