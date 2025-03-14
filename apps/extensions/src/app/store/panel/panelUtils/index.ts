import IExplorerData from '@/app/interfaces/IExplorerData';
import { IUser } from '@/app/interfaces/IUserData';
import { IWorkspace } from '@/app/interfaces/IWorkspace';

export const isRootFolder = (
  user: IUser,
  data: IExplorerData | IWorkspace | null,
): boolean => {
  return !user || !data?.currentFolder;
};
