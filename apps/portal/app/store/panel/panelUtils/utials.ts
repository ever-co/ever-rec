import IExplorerData from 'app/interfaces/IExplorerData';
import { IUser } from 'app/interfaces/IUserData';
import { IWorkspace } from '../../../interfaces/IWorkspace';

export const isRootFolder = (
  user: IUser,
  data: IExplorerData | IWorkspace,
): boolean => {
  return !user || !data?.currentFolder;
};
