import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { evaluateAccess, getUserAndWorkspace } from './utils';
import { parseCollectionToArray } from '../../../services/utils/helpers';
import { IWorkspaceFolder } from '../Interfaces/Folders';
import { PermissionAccessEnum } from '../Interfaces/Workspace';
import { REQUIRED_DESTINATION_FOLDER_ACCESS_METADATA } from '../decorators/CanAccessDestinationFolder.decorator';

// For routes that can move an item into the folder named by `parentId` in the body. The folder
// checks on the route look at the item's current folder; this one checks where the item goes.
// No `parentId`, or the workspace root (`false`), is not a move into a folder and stays allowed.
// Chain with CanAccessWorkspace.
@Injectable()
export class CanAccessDestinationFolderGuard implements CanActivate {
  constructor(private reflector: Reflector) {
    // left blank intentionally
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const { user, workspace, req } = await getUserAndWorkspace(context);
      const parentId = req.body?.parentId;

      if (
        parentId === undefined ||
        parentId === false ||
        parentId === 'false'
      ) {
        return true;
      }

      if (typeof parentId !== 'string' || parentId === '') {
        return false;
      }

      const folders = parseCollectionToArray(workspace.folders);
      const folder: IWorkspaceFolder = folders.find((x) => x.id === parentId);

      // A destination that does not exist cannot be written to.
      if (!folder) {
        return false;
      }

      if (user.id === workspace.admin) {
        return true;
      }

      const requiredAccessLevel = this.reflector.get<PermissionAccessEnum>(
        REQUIRED_DESTINATION_FOLDER_ACCESS_METADATA,
        context.getHandler(),
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
