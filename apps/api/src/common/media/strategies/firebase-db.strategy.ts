import { Injectable } from '@nestjs/common';
import { FirebaseAdminService } from 'src/module/firebase/services/firebase-admin.service';
import {
  IMediaDbOptions,
  IMediaDbRecord,
  MediaDbStrategy,
} from '../interfaces/media-db.interface';

@Injectable()
export class FirebaseDbStrategy extends MediaDbStrategy {
  constructor(private readonly firebaseAdmin: FirebaseAdminService) {
    super();
  }

  private getCollectionPath(uid: string, mediaType: string): string {
    return `users/${uid}/${mediaType}`;
  }

  async create(options: IMediaDbOptions): Promise<IMediaDbRecord> {
    const { uid, mediaType, data } = options;
    const db = this.firebaseAdmin.getDatabase();
    const collectionRef = db.ref(this.getCollectionPath(uid, mediaType));
    const newRef = collectionRef.push();

    const record: IMediaDbRecord = {
      id: newRef.key!,
      uid,
      created: new Date().toISOString(),
      refName: null,
      trash: false,
      likes: 0,
      views: 0,
      ...data,
    };

    await newRef.set(record);
    return record;
  }

  async read(
    uid: string,
    id: string,
    mediaType: string,
  ): Promise<IMediaDbRecord | null> {
    const db = this.firebaseAdmin.getDatabase();
    const ref = db.ref(`${this.getCollectionPath(uid, mediaType)}/${id}`);
    const snapshot = await ref.get();
    return snapshot.exists() ? (snapshot.val() as IMediaDbRecord) : null;
  }

  async update(
    uid: string,
    id: string,
    mediaType: string,
    data: Partial<IMediaDbRecord>,
  ): Promise<IMediaDbRecord> {
    const db = this.firebaseAdmin.getDatabase();
    const ref = db.ref(`${this.getCollectionPath(uid, mediaType)}/${id}`);

    const snapshot = await ref.get();
    if (!snapshot.exists()) {
      throw new Error(`Media record ${id} not found in ${mediaType}`);
    }

    const current = snapshot.val() as IMediaDbRecord;
    const updated = { ...current, ...data, updated: new Date().toISOString() };
    await ref.update(updated);
    return updated;
  }

  async delete(uid: string, id: string, mediaType: string): Promise<void> {
    const db = this.firebaseAdmin.getDatabase();
    const ref = db.ref(`${this.getCollectionPath(uid, mediaType)}/${id}`);
    await ref.remove();
  }
}
