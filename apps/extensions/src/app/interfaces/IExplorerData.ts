import IEditorImage, { IDbFolderData } from './IEditorImage';

export default interface IExplorerData {
  allFolders: IDbFolderData[];
  currentFolder: IDbFolderData | null;
  files: IEditorImage[];
  folders: IDbFolderData[];
  navigationFromFavoriteFolder?: boolean;
}
