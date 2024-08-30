import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionAccessEnum } from '../Interfaces/Workspace';
import { evaluateAccess, getItemData, getUserAndWorkspace } from './utils';
import { REQUIRED_ITEM_ACCESS_METADATA } from '../decorators/CanAccessItem.decorator';

// Chain with CanAccessWorkspace.
@Injectable()
export class CanAccessItemGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const requiredAccessLevel = this.reflector.get<PermissionAccessEnum>(
        REQUIRED_ITEM_ACCESS_METADATA,
        context.getHandler()
      );
      const { user, workspace, req } = await getUserAndWorkspace(context);
      const item = getItemData(context, req, workspace, this);

      if (user.id === workspace.admin) {
        return true;
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
