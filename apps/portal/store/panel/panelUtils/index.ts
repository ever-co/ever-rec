import IExplorerData from 'app/interfaces/IExplorerData';
import { IUser } from 'app/interfaces/IUserData';

export const isRootFolder = (
  user: IUser,
  explorerData: IExplorerData,
): boolean => {
  return !user || !explorerData.currentFolder;
};
