import { Injectable } from '@nestjs/common';
import {
  IMediaDbOptions,
  IMediaDbRecord,
  MediaDbStrategy,
} from '../interfaces/media-db.interface';

@Injectable()
export class MediaDbService {
  constructor(private readonly dbStrategy: MediaDbStrategy) {}

  async create(options: IMediaDbOptions): Promise<IMediaDbRecord> {
    return this.dbStrategy.create(options);
  }

  async read(
    uid: string,
    id: string,
    mediaType: string,
  ): Promise<IMediaDbRecord | null> {
    return this.dbStrategy.read(uid, id, mediaType);
  }

  async update(
    uid: string,
    id: string,
    mediaType: string,
    data: Partial<IMediaDbRecord>,
  ): Promise<IMediaDbRecord> {
    return this.dbStrategy.update(uid, id, mediaType, data);
  }

  async delete(uid: string, id: string, mediaType: string): Promise<void> {
    return this.dbStrategy.delete(uid, id, mediaType);
  }
}
