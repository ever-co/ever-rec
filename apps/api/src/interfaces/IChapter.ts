export interface IChapter {
  id: string;
  timestamp: string;
  timestampSeconds?: number;
  content: string;
  thumbnailURL: string;
  refName?: string;
}
