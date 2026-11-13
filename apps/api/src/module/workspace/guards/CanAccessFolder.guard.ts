import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  canAccessFolderById,
  getItemData,
  getUserAndWorkspace,
  isItemByFileName,
} from './utils';
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
      // A route that acts on an item named in the body checks the item's own folder; a folder id
      // in the URL must not redirect that check.
      const folderId = isItemByFileName(context, this)
        ? item?.parentId
        : req.query?.folderId || req.params?.folderId || item?.parentId;

      const requiredAccessLevel = this.reflector.get<PermissionAccessEnum>(
        REQUIRED_FOLDER_ACCESS_METADATA,
        context.getHandler(),
      );

      return canAccessFolderById(
        folderId,
        workspace,
        user,
        requiredAccessLevel,
      );
    } catch (e) {
      console.log(e);
      return false;
    }
  }
}
