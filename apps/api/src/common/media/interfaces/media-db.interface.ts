export type MediaType = 'videos' | 'screenshots' | 'soundshots' | 'camshots';

export interface IMediaDbRecord {
  id: string;
  uid: string;
  refName: string;
  title?: string;
  parentId?: string | false;
  trash?: boolean;
  created: string;
  likes: number | { uid: string; timestamp: number }[];
  views?: number;
  [key: string]: any; // extensible
}

export interface IMediaDbOptions {
  uid: string;
  mediaType: MediaType;
  data: Partial<IMediaDbRecord>;
  id?: string; // for updates
}

export abstract class MediaDbStrategy {
  abstract create(options: IMediaDbOptions): Promise<IMediaDbRecord>;
  abstract read(
    uid: string,
    id: string,
    mediaType: string,
  ): Promise<IMediaDbRecord | null>;
  abstract update(
    uid: string,
    id: string,
    mediaType: string,
    data: Partial<IMediaDbRecord>,
  ): Promise<IMediaDbRecord>;
  abstract delete(uid: string, id: string, mediaType: string): Promise<void>;
}
