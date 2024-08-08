import { IDbFolder } from '../../../interfaces/IEditorImage';
import { IAccess } from './Workspace';

export interface IWorkspaceFolder extends IDbFolder {
  isPublic: boolean;
  creator: string;
  access?: IAccess;
  isFavoredBy?: string[];
}
