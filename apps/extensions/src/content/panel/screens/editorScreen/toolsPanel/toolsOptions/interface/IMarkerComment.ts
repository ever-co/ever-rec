export interface IMarkerComment {
  id: string;
  markerId: string;
  content: string;
  timestamp: string | number;
  imageSrc: string;
  audioSrc: string;
  videoSrc: string;
  audioDuration: string;
  user: {
    id: string;
    photoUrl: string | null;
    displayName: string;
  };
}
