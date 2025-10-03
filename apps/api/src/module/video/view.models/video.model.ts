import { AuthProviderId } from 'src/module/auth/interfaces/auth.interface';
import { IUploadVideo } from '../../gauzy/interfaces/gauzy-upload.model';
import IEditorVideo from 'src/interfaces/IEditorVideo';

export interface IVideoPayload extends IUploadVideo {
  userId: string;
  file: Express.Multer.File;
  title: string;
  fullFileName: string;
  folderId: string;
}

export interface IRequestVideoUploader {
  token: string;
  video: IVideoPayload;
}

export interface IVideoUploader {
  setNext(next: IVideoUploader): IVideoUploader;
  handle(
    request: IRequestVideoUploader,
    result: Map<AuthProviderId, IEditorVideo>,
  ): Promise<void>;
}
