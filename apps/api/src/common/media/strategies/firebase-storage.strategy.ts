import { Injectable } from '@nestjs/common';
import moment from 'moment';
import { nanoid } from 'nanoid';
import { FirebaseAdminService } from 'src/module/firebase/services/firebase-admin.service';
import {
  IMediaMetadata,
  IMediaUploadOptions,
  MediaUploadStrategy,
} from '../interfaces/media-upload.interface';

@Injectable()
export class FirebaseStorageStrategy extends MediaUploadStrategy {
  constructor(private readonly firebaseAdmin: FirebaseAdminService) {
    super();
  }

  async upload(
    options: IMediaUploadOptions,
  ): Promise<{ url: string; metadata: IMediaMetadata }> {
    const bucket = this.firebaseAdmin.getStorageBucket();
    const filePath = this.buildStoragePath(options);

    const file = bucket.file(filePath);
    await file.save(options.buffer);

    const [metadata] = await file.getMetadata();
    const url = await this.generateSignedUrl(filePath);

    return {
      url,
      metadata: metadata as IMediaMetadata,
    };
  }

  // Helper to generate signed URL (reusable)
  private async generateSignedUrl(
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
  private buildStoragePath(options: IMediaUploadOptions): string {
    const root = options.workspaceId
      ? `workspaces/${options.workspaceId}`
      : `users/${options.uid}`;

    const filename = options.refName || options.filename || nanoid();
    return `${root}/${options.itemType}/${filename}`;
  }
}
