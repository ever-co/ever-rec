import { ITokens, IUser } from './IUser';
import { IResponseMetadata } from './IResponseMetadata';

export type IUserData = IUser & ITokens;

export const ITEM_TYPES = ['image', 'video'] as const;
export type ItemType = typeof ITEM_TYPES[number];

export const CAN_ACCESS_WORKSPACE_ITEM_TYPES = [
  'image',
  'video',
  'shared',
] as const;
export type CanAccessWorkspaceItemType =
  typeof CAN_ACCESS_WORKSPACE_ITEM_TYPES[number];

export const PERMISSION_ITEM_TYPES = [
  'screenshots',
  'videos',
  'folders',
] as const;
export type PermissionsItemType = typeof PERMISSION_ITEM_TYPES[number];

export type IDataResponse<T = any> = IResponseMetadata & { data: T };
