import { IUser } from './IUserData';

export interface ISharedItem {
  user: IUser | null;
  ip: string;
}
