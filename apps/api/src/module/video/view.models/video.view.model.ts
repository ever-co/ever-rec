import {
  DbCommentIntF,
  LikeIntF,
  ResponseComment,
} from '../../../services/utils/models/shared.model';

export class VideoViewModel {
  link: string;
  created: string;
  title: string;
  commentsLength?: number;
  email?: string;
  comments?: DbCommentIntF[] | ResponseComment[];
  likes?: LikeIntF[];
  views?: number;
}
