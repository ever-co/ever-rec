export interface IWhiteboard {
  id: string;
  name: string;
  admin: string;
  created: number;
  trash: boolean;
  favorite: boolean;
  isPublic: boolean;
  thumbnail?: string;
}
