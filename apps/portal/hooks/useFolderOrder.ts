import { useEffect, useState } from 'react';

//! careful: there are 2 duplicate interfaces for DbFolderData - IEditorVideo.ts
import { IDbFolderData } from 'app/interfaces/IEditorImage';
import IExplorerData from 'app/interfaces/IExplorerData';
import PanelAC from 'app/store/panel/actions/PanelAC';
import { sortFoldersByDate, sortFoldersbyName } from 'app/utilities/common';
import { useDispatch } from 'react-redux';
import { ItemOrderEnum } from 'app/enums/itemOrderEnum';
import { FolderTypeEnum } from 'app/enums/folderTypeEnum';
import {
  IWorkspace,
  IWorkspaceDbFolder,
  PermissionAccessEnum,
} from 'app/interfaces/IWorkspace';

const useFolderOrder = (
  propsData: IExplorerData | IWorkspace,
  folderOrder: ItemOrderEnum,
  folderType?: FolderTypeEnum,
  filterTeamId?: string | null,
) => {
  const dispatch = useDispatch();
  const [folderData, setFolderData] = useState<
    IDbFolderData[] | IWorkspaceDbFolder[] | null
  >(null);

  useEffect(() => {
    let foldersData: IWorkspaceDbFolder[] | IDbFolderData[];
    if (folderType === FolderTypeEnum.workspaceFolders) {
      const data = propsData as IWorkspace;
      foldersData = data?.workFolders;
    } else {
      const data = propsData as IExplorerData;
      foldersData = data?.currentFolder
        ? data?.currentFolder.children || []
        : data?.allFolders;
    }

    if (!folderOrder || !foldersData?.length) return setFolderData(null);

    switch (folderOrder) {
      case ItemOrderEnum.name:
        foldersData.sort(sortFoldersbyName);
        break;
      case ItemOrderEnum.dateNewest:
        foldersData.sort(sortFoldersByDate);
        break;
      case ItemOrderEnum.dateOldest:
        foldersData.sort(sortFoldersByDate).reverse();
        break;
      default:
        break;
    }

    // looks very similar to useItemOrder.ts
    if (filterTeamId) {
      foldersData = foldersData.filter((folder: any) => {
        const access = folder?.access;
        if (!access) return true;

        const teamAccess = access?.teams?.find(
          (team: any) => team.teamId === filterTeamId,
        );

        if (teamAccess) {
          const hasAccess = teamAccess.access !== PermissionAccessEnum.NONE;
          return hasAccess;
        }

        return true;
      });
    }

    setFolderData([...foldersData]);
  }, [folderOrder, folderType, propsData, filterTeamId]);

  const handleFolderOrderByName = () => {
    if (!folderType) return;

    dispatch(PanelAC.setFolderOrder(ItemOrderEnum.name, folderType));
  };

  const handleFolderOrderByDate = () => {
    if (!folderType) return;

    if (folderOrder === ItemOrderEnum.dateNewest) {
      dispatch(PanelAC.setFolderOrder(ItemOrderEnum.dateOldest, folderType));
      return;
    }

    dispatch(PanelAC.setFolderOrder(ItemOrderEnum.dateNewest, folderType));
  };

  return {
    folderData,
    handleFolderOrderByName,
    handleFolderOrderByDate,
  };
};

export default useFolderOrder;
