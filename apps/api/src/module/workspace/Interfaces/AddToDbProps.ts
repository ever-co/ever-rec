import { IChapter } from 'src/interfaces/IChapter';
import { IStreamingDbData } from 'src/interfaces/IEditorVideo';

export interface AddToDbProps {
  id: string;
  uid: string;
  title: string;
  refName: string;
  folderId: string | false;
  workspaceId: string;
  metadata: any;
  streamData?: IStreamingDbData;
  chapters?: IChapter[];
  chaptersEnabled?: boolean;
  stage?: any;
  originalImage?: string;
}
