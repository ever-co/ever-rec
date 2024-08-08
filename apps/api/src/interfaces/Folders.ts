export interface SingleFavFolder {
  name: string;
  id: string;
}

export interface IFavoriteFolders {
  images: { [id: string]: SingleFavFolder }[];
  videos: { [id: string]: SingleFavFolder }[];
  workspaces: {
    [workspaceId: string]: { [id: string]: SingleFavFolder }[];
  };
}
