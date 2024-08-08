export interface DbCommentIntF {
  id: string;
  content: string;
  timestamp: number;
  updatedTimestamp?: string | number;
  uid: string;
  isEdited: boolean;
}

interface ResponseCommentIntF extends DbCommentIntF {
  user: {
    id: string;
    photoURL: string | null;
    name?: string | null;
  };
}

export type ResponseComment = Omit<ResponseCommentIntF, 'uid'>;

export type ICommentResponse = ResponseCommentIntF;

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
