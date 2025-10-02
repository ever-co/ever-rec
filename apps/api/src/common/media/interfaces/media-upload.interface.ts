// src/media/interfaces/media-upload.interface.ts
export interface IMediaMetadata {
  timeCreated: string;
  name: string;
  [key: string]: any;
}

export interface IMediaUploadOptions {
  uid?: string;
  workspaceId?: string;
  filename: string;
  itemType: 'videos' | 'screenshots' | 'soundshots' | 'camshots';
  buffer: Buffer;
  refName?: string; // for overwrites
}

export abstract class MediaUploadStrategy {
  abstract upload(
    options: IMediaUploadOptions,
  ): Promise<{ url: string; metadata: IMediaMetadata }>;
}
