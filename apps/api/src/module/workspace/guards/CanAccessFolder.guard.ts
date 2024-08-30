import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { evaluateAccess, getItemData, getUserAndWorkspace } from './utils';
import { parseCollectionToArray } from '../../../services/utils/helpers';
import { IWorkspaceFolder } from '../Interfaces/Folders';
import { PermissionAccessEnum } from '../Interfaces/Workspace';
import { REQUIRED_FOLDER_ACCESS_METADATA } from '../decorators/CanAccessFolder.decorator';

@Injectable()
export class CanAccessFolderGuard implements CanActivate {
  constructor(private reflector: Reflector) {
    // left blank intentionally
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const { user, workspace, req } = await getUserAndWorkspace(context);
      const item = getItemData(context, req, workspace, this);
      const folderId =
        req.query?.folderId || req.params?.folderId || item?.parentId;

      if (!folderId || folderId === 'false' || user.id === workspace.admin) {
        return true;
      }

      const folders = parseCollectionToArray(workspace.folders);
      const folder: IWorkspaceFolder = folders.find(x => x.id === folderId);
      const requiredAccessLevel = this.reflector.get<PermissionAccessEnum>(
        REQUIRED_FOLDER_ACCESS_METADATA,
        context.getHandler()
      );

      if (folder.access) {
        return evaluateAccess(folder, workspace, user, requiredAccessLevel);
      }

      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }
}
