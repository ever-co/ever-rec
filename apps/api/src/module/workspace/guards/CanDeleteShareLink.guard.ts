import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { parseCollectionToArray } from '../../../services/utils/helpers';
import { PermissionAccessEnum } from '../Interfaces/Workspace';
import { is_id } from '../validators/id.validator';
import {
  canAccessFolderById,
  canAccessItemData,
  getUserAndWorkspace,
} from './utils';

/**
 * Guards `DELETE workspace/share/deleteLink/:workspaceId/:itemId`, where the clients send the id of
 * the share LINK in the `:itemId` slot. The link is loaded and must belong to the workspace in the
 * path; the caller then needs WRITE on the item and its folder, the rule the share-create route
 * applies. An unknown link, a link of another workspace and a malformed id are all the same
 * refusal, so the answer does not reveal which links exist. A link whose item no longer exists can
 * only be removed by the workspace admin. Fails closed: any error is a refusal.
 *
 * Chain after `AuthGuard` and `CanAccessWorkspaceGuard`.
 */
@Injectable()
export class CanDeleteShareLinkGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const { user, workspace, req } = await getUserAndWorkspace(context);
      const linkId = req.params?.itemId;
      if (typeof linkId !== 'string' || !is_id(linkId) || !workspace) {
        return false;
      }

      const linkSnap = await admin
        .database()
        .ref(`sharedWorkspaceItems/${linkId}`)
        .get();
      const link = linkSnap.val();
      if (!link || link.workspaceId !== req.params.workspaceId) {
        return false;
      }

      if (user.id === workspace.admin) {
        return true;
      }

      const item = [
        ...parseCollectionToArray<any>(workspace.screenshots),
        ...parseCollectionToArray<any>(workspace.videos),
      ].find((x) => x?.id === link.itemId);
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
