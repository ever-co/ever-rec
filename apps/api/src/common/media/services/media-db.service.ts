import { Injectable } from '@nestjs/common';
import {
  IMediaDbOptions,
  IMediaDbRecord,
} from '../interfaces/media-db.interface';
import { FirebaseDbStrategy } from '../strategies/firebase-db.strategy';

@Injectable()
export class MediaDbService {
  constructor(private readonly firebaseDbStrategy: FirebaseDbStrategy) {}

  async create(options: IMediaDbOptions): Promise<IMediaDbRecord> {
    return this.firebaseDbStrategy.create(options);
  }

  async read(
    uid: string,
    id: string,
    mediaType: string,
  ): Promise<IMediaDbRecord | null> {
    return this.firebaseDbStrategy.read(uid, id, mediaType);
  }

  async update(
    uid: string,
    id: string,
    mediaType: string,
    data: Partial<IMediaDbRecord>,
  ): Promise<IMediaDbRecord> {
    return this.firebaseDbStrategy.update(uid, id, mediaType, data);
  }

  async delete(uid: string, id: string, mediaType: string): Promise<void> {
    return this.firebaseDbStrategy.delete(uid, id, mediaType);
  }
}
