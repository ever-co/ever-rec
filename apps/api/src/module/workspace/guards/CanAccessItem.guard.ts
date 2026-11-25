import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionAccessEnum } from '../Interfaces/Workspace';
import {
  evaluateAccess,
  getItemData,
  getUserAndWorkspace,
  isItemByFileName,
} from './utils';
import {
  ITEM_MUST_EXIST_METADATA,
  REQUIRED_ITEM_ACCESS_METADATA,
} from '../decorators/CanAccessItem.decorator';

// Chain with CanAccessWorkspace.
@Injectable()
export class CanAccessItemGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const requiredAccessLevel = this.reflector.get<PermissionAccessEnum>(
        REQUIRED_ITEM_ACCESS_METADATA,
        context.getHandler(),
      );
      const { user, workspace, req } = await getUserAndWorkspace(context);
      const item = getItemData(context, req, workspace, this);

      // A route that updates an existing item must find it, for the admin too.
      if (
        !item &&
        this.reflector.get(ITEM_MUST_EXIST_METADATA, context.getHandler()) ===
          true
      ) {
        return false;
      }

      if (user.id === workspace.admin) {
        return true;
      }

      // A route that names its item by file name must find that item; no item, no access.
      if (!item && isItemByFileName(context, this)) {
        return false;
      }

      if (item?.access) {
        return evaluateAccess(item, workspace, user, requiredAccessLevel);
      }

      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }
}
