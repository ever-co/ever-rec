import { Injectable, Logger } from '@nestjs/common';
import IEditorImage from 'src/interfaces/IEditorImage';
import { AuthProviderId } from 'src/module/auth/interfaces/auth.interface';
import { IRequestImageUploader } from '../view.models/image.model';
import { FirebaseImageUploader } from './firebase-image.upload';

@Injectable()
export class ContextUploader {
  private readonly logger = new Logger(ContextUploader.name);

  constructor(private readonly firebaseImageUploader: FirebaseImageUploader) {}

  public async upload(payload: IRequestImageUploader): Promise<IEditorImage> {
    this.logger.log(`uploading file ${payload.image.fullFileName}...`);

    const result = new Map<AuthProviderId, IEditorImage>();

    await this.firebaseImageUploader.handle(payload, result);

    return result.get(AuthProviderId.FIREBASE);
  }
}
