import { AuthProviderId } from 'src/module/auth/interfaces/auth.interface';
import { IUploadScreenshot } from '../../gauzy/interfaces/gauzy-upload.model';
import IEditorImage from 'src/interfaces/IEditorImage';

export interface IImagePayload extends IUploadScreenshot {
  userId: string;
  file: Express.Multer.File;
  title: string;
  fullFileName: string;
  folderId: string;
}

export interface IRequestImageUploader {
  token: string;
  image: IImagePayload;
}

export interface IImageUploader {
  setNext(next: IImageUploader): IImageUploader;
  handle(
    request: IRequestImageUploader,
    result: Map<AuthProviderId, IEditorImage>,
  ): Promise<void>;
}
