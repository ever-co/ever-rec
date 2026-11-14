export interface IComment {
  id: string;
  content: string;
  timestamp: string | number;
  // Set by the API: true for the viewer's own comments (the API does not send author ids).
  isOwn?: boolean;
  user: {
    id?: string;
    photoUrl: string | null;
  };
}
