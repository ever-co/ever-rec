import { IMarkerComment } from '@/content/panel/screens/editorScreen/toolsPanel/toolsOptions/interface/IMarkerComment';

export interface IMarker {
  id: string;
  admin: string;
  imageId: string;
  created: number;
  comments: IMarkerComment[];
}
