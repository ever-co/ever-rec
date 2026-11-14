export interface DbCommentIntF {
  id: string;
  content: string;
  timestamp: number;
  updatedTimestamp?: string | number;
  uid: string;
  isEdited: boolean;
}

/**
 * A comment as the API shows it to a viewer. The stored `uid` of the author is never part of it:
 * the API resolves the author's name and photo itself, and `isOwn` tells the viewer's client
 * whether to offer edit and delete. `user.id` is only set on the viewer's own comments.
 */
export interface ResponseComment extends Omit<DbCommentIntF, 'uid'> {
  isOwn: boolean;
  user: {
    id?: string;
    photoURL: string | null;
    name?: string | null;
  };
}

export type ICommentResponse = ResponseComment;

export interface LikeIntF {
  uid: string;
  timestamp: number;
}

export interface IUniqueView {
  id?: string;
  displayName?: string;
  photoURL?: string;
  email?: string;
  timestamp?: number;
}

export interface IView {
  ip: string;
  timestamp: number;
}
