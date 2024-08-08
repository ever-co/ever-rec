export interface IComment {
  id: string;
  content: string;
  timestamp: string | number;
  user: {
    id: string;
    photoUrl: string | null;
  };
}
