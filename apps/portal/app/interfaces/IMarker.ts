import { IMarkerComment } from './IMarkerComment';

export interface IMarker {
  id: string;
  admin: string;
  imageId: string;
  created: number;
  comments: IMarkerComment[];
}
