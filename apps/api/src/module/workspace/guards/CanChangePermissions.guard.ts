import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { evaluateAccess, getUserAndWorkspace } from './utils';
import { parseCollectionToArray } from '../../../services/utils/helpers';
import { PermissionAccessEnum } from '../Interfaces/Workspace';
import {
  PERMISSIONS_TARGET_METADATA,
  PermissionsTarget,
} from '../decorators/CanChangePermissions.decorator';

/**
 * Lets a request that rewrites the permissions of one item or folder through only when the user
 * has ADMIN on that item or folder: the workspace admin always, anyone else only when the item's
 * or folder's own permissions grant them ADMIN. An item or folder with no permissions of its own
 * has no ADMIN member, so only the workspace admin may change it. An id that matches nothing is
 * refused, for the workspace admin too. The guard fails closed: any error is a refusal.
 *
 * Chain after `AuthGuard` and `CanAccessWorkspaceGuard`. The route needs `:workspaceId` and the id
 * of the target in `:itemId` (items) or `:folderId` (folders). For items the collection comes from
 * `permissionItemType` in the body, the same field the handler uses to pick the collection.
 */
@Injectable()
export class CanChangePermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {
    // left blank intentionally
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const target = this.reflector.get<PermissionsTarget>(
        PERMISSIONS_TARGET_METADATA,
        context.getHandler(),
      );
      const { user, workspace, req } = await getUserAndWorkspace(context);

      let targetId: unknown;
      let collection: unknown;
      if (target === 'folder') {
        targetId = req.params?.folderId;
        collection = workspace.folders;
      } else if (target === 'item') {
        targetId = req.params?.itemId;
        const itemType = req.body?.permissionItemType;
        if (itemType !== 'screenshots' && itemType !== 'videos') {
          return false;
        }
        collection = workspace[itemType];
      } else {
        return false;
      }

      if (typeof targetId !== 'string' || targetId === '') {
        return false;
      }

      const found = parseCollectionToArray(collection as object).find(
        (x) => x?.id === targetId,
      );
      if (!found) {
        return false;
      }

      if (user.id === workspace.admin) {
        return true;
      }

      if (!found.access) {
        return false;
      }

      // `evaluateAccess` lets any member through when the item names no members at all and the
      // workspace has teams. That fallback must not hand out ADMIN, so the member list is made
      // explicit (the database drops empty lists).
      const access = {
        ...found,
        access: {
          ...found.access,
          members: found.access.members ?? [],
        },
      };

      return (
        evaluateAccess(access, workspace, user, PermissionAccessEnum.ADMIN) ===
        true
      );
    } catch (e) {
      console.log(e);
      return false;
    }
  }
}
