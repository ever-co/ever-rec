import { IMediaDbRecord } from 'src/common/media/interfaces/media-db.interface';
import { AuthProviderId } from 'src/module/auth/interfaces/auth.interface';
import { IUploadSoundShot } from '../../gauzy/interfaces/gauzy-upload.model';

export interface ISoundshotDbRecord extends IMediaDbRecord {
  duration?: number; // in seconds
  mimeType?: string;
  channels?: number;
  sampleRate?: number;
}

export interface ISoundshotPayload extends IUploadSoundShot {
  userId: string;
  file: Express.Multer.File;
  title: string;
  fullFileName: string;
  folderId: string;
}

export interface IRequestSoundshotUploader {
  token: string;
  soundshot: ISoundshotPayload;
}

export interface ISoundshotUploader {
  setNext(next: ISoundshotUploader): ISoundshotUploader;
  handle(
    request: IRequestSoundshotUploader,
    result: Map<AuthProviderId, ISoundshotDbRecord>,
  ): Promise<void>;
}
