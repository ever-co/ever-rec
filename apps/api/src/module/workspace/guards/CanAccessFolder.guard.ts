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
      // When the route acts on an existing item, the item's own folder decides: a folder id in the
      // URL (for example `?folderId=false`) must not redirect or skip that check. Routes without
      // an item (uploads, moves from personal) check the folder named in the request. A route that
      // names its folder in the path (`:folderId`) is checked on that folder only: `?folderId=` in
      // the query never replaces it and `?folderId=false` never skips the check.
      let folderId: unknown;
      if (item || isItemByFileName(context, this)) {
        folderId = item?.parentId;
      } else if (typeof req.params?.folderId === 'string') {
        folderId = req.params.folderId;
      } else {
        folderId = req.query?.folderId;
      }

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
