import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MediaDbService } from 'src/common/media/services/media-db.service';
import { MediaUploadService } from 'src/common/media/services/media-upload.service';
import { IDataResponse } from '../../interfaces/_types';
import { sendError, sendResponse } from '../../services/utils/sendResponse';
import { ICamshotPayload } from './interfaces/camshot.interface';

@Injectable()
export class CamshotService {
  private readonly itemType = 'camshots';
  constructor(
    private readonly mediaUploadService: MediaUploadService,
    private readonly mediaDbService: MediaDbService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async uploadCamshot(
    input: Partial<ICamshotPayload>,
  ): Promise<IDataResponse<any>> {
    const { userId: uid, file, title, folderId } = input;

    try {
      // Optional: validate image file (e.g., mime type)
      if (!file.mimetype.startsWith('image/')) {
        return sendError('Invalid file type. Only image files are allowed.');
      }

      const filename = file.filename || `${Date.now()}.webm`;

      // 1. Upload to Firebase Storage
      const uploadResult = await this.mediaUploadService.upload({
        uid,
        filename,
        itemType: this.itemType,
        buffer: file.buffer,
      });

      // 2. Save metadata to Realtime Database
      const dbData = await this.mediaDbService.create({
        uid,
        mediaType: this.itemType,
        data: {
          refName: filename,
          title: title ?? file.originalname,
          parentId: folderId || false,
          mimeType: file.mimetype,
        },
      });

      this.eventEmitter.emit('analytics.track', 'Camshot Uploaded', {
        userId: uid,
        properties: { title, url: uploadResult.url },
      });

      return sendResponse({
        url: uploadResult.url,
        ref: uploadResult.metadata,
        dbData,
      });
    } catch (error) {
      console.error('Camshot upload failed:', error);
      return sendError('Failed to upload camshot', error.message);
    }
  }
}
