import { Injectable } from '@nestjs/common';
import { MediaUploadStrategy } from '../interfaces/media-upload.interface';
import {
  IMediaUploadOptions,
  IMediaMetadata,
} from '../interfaces/media-upload.interface';
import { MediaUploadService } from '../services/media-upload.service';
import { FirebaseAdminService } from 'src/module/firebase/services/firebase-admin.service';

@Injectable()
export class FirebaseStorageStrategy extends MediaUploadStrategy {
  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly mediaUploadService: MediaUploadService,
  ) {
    super();
  }

  async upload(
    options: IMediaUploadOptions,
  ): Promise<{ url: string; metadata: IMediaMetadata }> {
    const bucket = this.firebaseAdmin.getStorageBucket();
    const filePath = this.mediaUploadService.buildStoragePath(options);

    const file = bucket.file(filePath);
    await file.save(options.buffer);

    const [metadata] = await file.getMetadata();
    const url = await this.mediaUploadService.generateSignedUrl(filePath);

    return {
      url,
      metadata: metadata as IMediaMetadata,
    };
  }
}
