import { Injectable } from '@nestjs/common';
import {
  IMediaMetadata,
  IMediaUploadOptions,
} from '../interfaces/media-upload.interface';
import { FirebaseStorageStrategy } from '../strategies/firebase-storage.strategy';

@Injectable()
export class MediaUploadService {
  constructor(
    private readonly firebaseUploadStrategy: FirebaseStorageStrategy,
  ) {}

  public async upload(
    options: IMediaUploadOptions,
  ): Promise<{ url: string; metadata: IMediaMetadata }> {
    return this.firebaseUploadStrategy.upload(options);
  }
}
