import { MediaType } from './media-db.interface';
export interface IMediaMetadata {
  timeCreated: string;
  name: string;
  [key: string]: any;
}

export interface IMediaUploadOptions {
  uid?: string;
  workspaceId?: string;
  filename: string;
  itemType: MediaType;
  buffer: Buffer;
  refName?: string; // for overwrites
}

export abstract class MediaUploadStrategy {
  abstract upload(
    options: IMediaUploadOptions,
  ): Promise<{ url: string; metadata: IMediaMetadata }>;
}
