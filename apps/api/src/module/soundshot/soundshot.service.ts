import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as fs from 'fs/promises';
import { MediaDbService } from 'src/common/media/services/media-db.service';
import { MediaUploadService } from 'src/common/media/services/media-upload.service';
import { IDataResponse } from '../../interfaces/_types';
import { sendError, sendResponse } from '../../services/utils/sendResponse';
import { ISoundShotPayload } from './interfaces/soundshot.interface';

@Injectable()
export class SoundshotService {
  private readonly itemType = 'soundshots';
  constructor(
    private readonly mediaUploadService: MediaUploadService,
    private readonly mediaDbService: MediaDbService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async uploadSoundshot(
    input: Partial<ISoundShotPayload>,
  ): Promise<IDataResponse<any>> {
    const { userId: uid, file, title, duration, folderId } = input;

    try {
      // Optional: validate audio file (e.g., mime type)
      if (!file.mimetype.startsWith('audio/')) {
        return sendError('Invalid file type. Only audio files are allowed.');
      }

      const buffer = await fs.readFile(file.path);
      const filename = file.filename || `${Date.now()}.webm`;

      // 1. Upload to Firebase Storage
      const uploadResult = await this.mediaUploadService.upload({
        uid,
        filename,
        itemType: this.itemType,
        buffer,
      });

      // 2. Save metadata to Realtime Database
      const dbData = await this.mediaDbService.create({
        uid,
        mediaType: this.itemType,
        data: {
          refName: filename,
          title,
          duration,
          parentId: folderId || false,
          mimeType: file.mimetype,
        },
      });

      this.eventEmitter.emit('analytics.track', 'Soundshot Uploaded', {
        userId: uid,
        properties: { title, url: uploadResult.url, duration },
      });

      return sendResponse({
        url: uploadResult.url,
        ref: uploadResult.metadata,
        dbData,
      });
    } catch (error) {
      console.error('Soundshot upload failed:', error);
      return sendError('Failed to upload soundshot', error.message);
    }
  }
}
