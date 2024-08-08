import IEditorImage from '@/app/interfaces/IEditorImage';
import IEditorVideo from '@/app/interfaces/IEditorVideo';
import { WorkspaceItemType } from '@/app/interfaces/ItemTypes';
import { PermissionAccessEnum } from '@/app/interfaces/IWorkspace';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import { sortbyDate, sortbyName } from '@/app/utilities/common';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { ItemOrderEnum } from '../enums/itemOrderEnum';
import { ItemTypeEnum } from '../enums/itemTypeEnum';

const useItemOrder = (
  items: WorkspaceItemType[] | IEditorImage[] | IEditorVideo[],
  itemOrder: ItemOrderEnum,
  itemType: ItemTypeEnum,
  filterTeamId?: string | null,
) => {
  const dispatch = useDispatch();
  const [itemData, setItemData] = useState<WorkspaceItemType[] | null>(null);

  useEffect(() => {
    if (!items.length) return setItemData(null);

    let sortedItems = [...items];
    switch (itemOrder) {
      case ItemOrderEnum.name:
        sortedItems.sort(sortbyName);
        break;
      case ItemOrderEnum.dateNewest:
        sortedItems.sort(sortbyDate);
        break;
      case ItemOrderEnum.dateOldest:
        sortedItems.sort(sortbyDate).reverse();
        break;
      default:
        break;
    }

    // looks very similar to useFolderOrder.ts
    if (filterTeamId) {
      sortedItems = sortedItems.filter((item: any) => {
        const access = item?.dbData?.access;
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

    // @ts-ignore
    setItemData([...sortedItems]);
  }, [itemOrder, items, filterTeamId]);

  const handleItemOrderByName = () => {
    if (!itemType) return;

    dispatch(PanelAC.setItemOrder(ItemOrderEnum.name, itemType));
  };

  const handleItemOrderByDate = () => {
    if (!itemType) return;

    if (itemOrder === ItemOrderEnum.dateNewest) {
      dispatch(PanelAC.setItemOrder(ItemOrderEnum.dateOldest, itemType));
      return;
    }

    dispatch(PanelAC.setItemOrder(ItemOrderEnum.dateNewest, itemType));
  };

  return {
    itemData,
    handleItemOrderByName,
    handleItemOrderByDate,
  };
};

export default useItemOrder;
