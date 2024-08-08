import IEditorVideo, { DbVideoData } from '../../../interfaces/IEditorVideo';
import IEditorImage, { DbImgData } from '../../../interfaces/IEditorImage';
import { IAccess } from './Workspace';

export interface IDbWorkspaceVideoData extends DbVideoData {
  workspaceIds: string[];
  isPublic: boolean;
  access?: IAccess;
}

export interface IDbWorkspaceImageData extends DbImgData {
  workspaceIds: string[];
  isPublic: boolean;
  access?: IAccess;
}

export interface IWorkspaceImage extends IEditorImage {
  dbData: IDbWorkspaceImageData;
}

export interface IWorkspaceVideo extends IEditorVideo {
  dbData: IDbWorkspaceVideoData;
}
