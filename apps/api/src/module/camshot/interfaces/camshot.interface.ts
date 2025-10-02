import { IMediaDbRecord } from 'src/common/media/interfaces/media-db.interface';
import { AuthProviderId } from 'src/module/auth/interfaces/auth.interface';
import { IUploadCamShot } from '../../gauzy/interfaces/gauzy-upload.model';

export interface ICamshotDbRecord extends IMediaDbRecord {
  duration?: number; // in seconds
  mimeType?: string;
  channels?: number;
  sampleRate?: number;
}

export interface ICamshotPayload extends IUploadCamShot {
  userId: string;
  file: Express.Multer.File;
  title: string;
  fullFileName: string;
  folderId: string;
}

export interface IRequestCamshotUploader {
  token: string;
  camshot: ICamshotPayload;
}

export interface ICamshotUploader {
  setNext(next: ICamshotUploader): ICamshotUploader;
  handle(
    request: IRequestCamshotUploader,
    result: Map<AuthProviderId, ICamshotDbRecord>,
  ): Promise<void>;
}
