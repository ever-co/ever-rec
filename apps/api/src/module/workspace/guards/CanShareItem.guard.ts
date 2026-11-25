import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { parseCollectionToArray } from '../../../services/utils/helpers';
import { PermissionAccessEnum } from '../Interfaces/Workspace';
import { is_id } from '../validators/id.validator';
import {
  canAccessFolderById,
  canAccessItemData,
  getUserAndWorkspace,
} from './utils';

/**
 * Guards `GET workspace/share/:workspaceId/:itemId`. The item is the one named by `:itemId` in the
 * PATH, whatever a same-named query value says: it must exist in the workspace (the admin
 * included, so no link record is created for an unknown id), and the caller needs WRITE on it and
 * on its folder. Fails closed: any error is a refusal.
 *
 * Chain after `AuthGuard` and `CanAccessWorkspaceGuard`.
 */
@Injectable()
export class CanShareItemGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const { user, workspace, req } = await getUserAndWorkspace(context);
      const itemId = req.params?.itemId;
      if (typeof itemId !== 'string' || !is_id(itemId) || !workspace) {
        return false;
      }

      const item = [
        ...parseCollectionToArray<any>(workspace.screenshots),
        ...parseCollectionToArray<any>(workspace.videos),
      ].find((x) => x?.id === itemId);
      if (!item) {
        return false;
      }

      const write = PermissionAccessEnum.WRITE;
      return (
        canAccessItemData(item, workspace, user, write) &&
        canAccessFolderById(item.parentId, workspace, user, write)
      );
    } catch (e) {
      console.log(e);
      return false;
    }
  }
}
