import { IWorkspaceImage, IWorkspaceVideo } from './IWorkspace';

export type ItemType = 'image' | 'video';
export type PermissionsItemType = 'screenshots' | 'videos' | 'folders';
export type WorkspaceItemType = IWorkspaceImage | IWorkspaceVideo;
export type MixedItemType = 'image' | 'video' | 'mixed'