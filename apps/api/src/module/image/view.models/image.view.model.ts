import {
  DbCommentIntF,
  LikeIntF,
  ResponseComment,
} from '../../../services/utils/models/shared.model';

export class ImageViewModel {
  link: string;
  created: string;
  title: string;
  commentsLength?: number;
  comments?: DbCommentIntF[] | ResponseComment[];
  likes: LikeIntF[];
  views: number;
}
