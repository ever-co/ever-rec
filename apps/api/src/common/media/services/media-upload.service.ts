import { Injectable } from '@nestjs/common';
import {
  IMediaMetadata,
  IMediaUploadOptions,
  MediaUploadStrategy,
} from '../interfaces/media-upload.interface';
import { nanoid } from 'nanoid';
import moment from 'moment';
import { FirebaseAdminService } from 'src/module/firebase/services/firebase-admin.service';

@Injectable()
export class MediaUploadService {
  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  public async upload(
    strategy: MediaUploadStrategy,
    options: IMediaUploadOptions,
  ): Promise<{ url: string; metadata: IMediaMetadata }> {
    return strategy.upload(options);
  }

  // Helper to generate signed URL (reusable)
  public async generateSignedUrl(
    filePath: string,
    expires?: string | Date,
  ): Promise<string> {
    const bucket = this.firebaseAdmin.getStorageBucket();
    const [url] = await bucket.file(filePath).getSignedUrl({
      action: 'read',
      expires: expires || moment().add(1, 'year').toDate(),
    });
    return url;
  }

  // Helper to build storage path
  public buildStoragePath(options: IMediaUploadOptions): string {
    const root = options.workspaceId
      ? `workspaces/${options.workspaceId}`
      : `users/${options.uid}`;

    const filename = options.refName || options.filename || nanoid();
    return `${root}/${options.itemType}/${filename}`;
  }
}
