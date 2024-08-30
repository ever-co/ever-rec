import { ExecutionContext } from '@nestjs/common';
import * as admin from 'firebase-admin';
import {
  IAccessMember,
  IWorkspace,
  PermissionAccessEnum,
} from '../Interfaces/Workspace';
import { IRequestUser } from '../../auth/guards/auth.guard';
import {
  IDbWorkspaceImageData,
  IDbWorkspaceVideoData,
} from '../Interfaces/Files';
import {
  evaluateAccessType,
  parseCollectionToArray,
} from '../../../services/utils/helpers';
import { IAccessTeam, IWorkspaceTeam } from '../Interfaces/Teams';
import { IWorkspaceFolder } from '../Interfaces/Folders';
import { IUser } from '../../../interfaces/IUser';
import { CanAccessWorkspaceItemType } from 'src/interfaces/_types';
import { ITEM_TYPE_METADATA } from '../decorators/CanAccessItem.decorator';

// HIGHLY NON-reusable. Depends on Request to have user (attached before, with AuthGuard or some guard
// Also requires that the param name is :workspaceId.
// Maybe can be rewritten, but it will be good, that it makes us write same code/convention everywhere for now.
export const getUserAndWorkspace = async (
  context: ExecutionContext
): Promise<{ user: IRequestUser; workspace: IWorkspace; req: any }> => {
  const db = admin.database();
  const req = context.switchToHttp().getRequest();
  const workspaceId = req.params?.workspaceId;
  const user = req.user;
  const workspaceRef = db.ref(`workspaces/${workspaceId}`);
  const workspaceSnap = await workspaceRef.get();
  const workspaceVal: IWorkspace = workspaceSnap.val();

  return { user, workspace: workspaceVal, req };
};

export function getItemData(
  context: ExecutionContext,
  req: any,
  workspace: IWorkspace,
  that: any
): IDbWorkspaceImageData | IDbWorkspaceVideoData {
  const itemType: CanAccessWorkspaceItemType = that.reflector.get(
    ITEM_TYPE_METADATA,
    context.getHandler()
  );
  let itemId;
  let collection;
  const screenshots = parseCollectionToArray(workspace.screenshots);
  const videos = parseCollectionToArray(workspace.videos);

  switch (itemType) {
    case 'shared': {
      itemId = req.query?.itemId || req.params?.itemId;
      collection = [...screenshots, ...videos];
      break;
    }
    case 'image': {
      itemId = req.query?.imageId || req.params?.imageId;
      collection = screenshots;
      break;
    }
    case 'video':
      itemId = req.query?.videoId || req.params?.videoId;
      collection = videos;
      break;

    default:
  }

  const item: IDbWorkspaceImageData | IDbWorkspaceVideoData =
    parseCollectionToArray(collection).find(
      (x: IDbWorkspaceImageData | IDbWorkspaceVideoData) => x.id === itemId
    );

  return item;
}

export const evaluateAccess = (
  item: IDbWorkspaceImageData | IDbWorkspaceVideoData | IWorkspaceFolder,
  workspace: IWorkspace,
  user: IUser,
  requiredAccessLevel: PermissionAccessEnum
) => {
  let hasAccessByTeam: boolean;
  let hasAccessByMember: boolean;
  const workspaceUser = workspace.members.find(x => x.id === user.id);

  if (item.access.teams) {
    hasAccessByTeam = parseCollectionToArray(workspaceUser.teams).some(
      (workspaceTeam: IWorkspaceTeam) =>
        item.access.teams.some((accessTeam: IAccessTeam) => {
          const givenAccess =
            requiredAccessLevel === PermissionAccessEnum.ADMIN
              ? user.id === workspace.admin
                ? PermissionAccessEnum.ADMIN
                : accessTeam.access
              : accessTeam.access;
          return (
            accessTeam.teamId === workspaceTeam.id &&
            evaluateAccessType(givenAccess, requiredAccessLevel)
          );
        })
    );
  }

  if (item.access.members) {
    hasAccessByMember = parseCollectionToArray(item.access.members).some(
      (member: IAccessMember) => {
        const givenAccess =
          requiredAccessLevel === PermissionAccessEnum.ADMIN
            ? user.id === workspace.admin
              ? PermissionAccessEnum.ADMIN
              : member.access
            : member.access;

        return (
          member.uid === user.id &&
          evaluateAccessType(givenAccess, requiredAccessLevel)
        );
      }
    );
  }

  if (
    hasAccessByMember === undefined &&
    parseCollectionToArray(workspace.teams).length > 0
  ) {
    return true;
  }

  if (
    hasAccessByMember === undefined &&
    parseCollectionToArray(workspace.teams).length > 0
  ) {
    return true;
  }

  return hasAccessByTeam || hasAccessByMember;
};
