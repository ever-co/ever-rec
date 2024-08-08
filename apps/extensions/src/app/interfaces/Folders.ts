import { ItemTypeEnum } from '@/content/panel/screens/imagesScreen/pages/shared/enums/itemTypeEnum';

export interface SingleFavFolder {
  name: string;
  id: string;
  type: ItemTypeEnum;
  workspaceId?: string;
}

export interface IFavoriteFolders {
  images: { [id: string]: SingleFavFolder };
  videos: { [id: string]: SingleFavFolder };
  workspaces: {
    [workspaceId: string]: { [id: string]: SingleFavFolder };
  };
}
