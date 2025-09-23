import { Injectable, Logger } from '@nestjs/common';
import IEditorVideo from 'src/interfaces/IEditorVideo';
import { AuthProviderId } from 'src/module/auth/interfaces/auth.interface';
import { IRequestVideoUploader } from '../../view.models/video.model';
import { FirebaseVideoUploader } from './firebase-video.upload';

@Injectable()
export class ContextUploader {
  private readonly logger = new Logger(ContextUploader.name);

  constructor(private readonly firebaseImageUploader: FirebaseVideoUploader) {}

  public async upload(payload: IRequestVideoUploader): Promise<IEditorVideo> {
    this.logger.log(`uploading file ${payload.video.fullFileName}...`);

    const result = new Map<AuthProviderId, IEditorVideo>();

    await this.firebaseImageUploader.handle(payload, result);

    return result.get(AuthProviderId.FIREBASE);
  }
}
