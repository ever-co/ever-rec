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
import {
  ITEM_BY_FILE_NAME_METADATA,
  ITEM_TYPE_METADATA,
} from '../decorators/CanAccessItem.decorator';

// HIGHLY NON-reusable. Depends on Request to have user (attached before, with AuthGuard or some guard
// Also requires that the param name is :workspaceId.
// Maybe can be rewritten, but it will be good, that it makes us write same code/convention everywhere for now.
export const getUserAndWorkspace = async (
  context: ExecutionContext,
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

// True for routes marked with `@ItemByFileName()`: the item is named by `fullFileName` in the body.
export function isItemByFileName(context: ExecutionContext, that: any) {
  return (
    that.reflector.get(ITEM_BY_FILE_NAME_METADATA, context.getHandler()) ===
    true
  );
}

export function getItemData(
  context: ExecutionContext,
  req: any,
  workspace: IWorkspace,
  that: any,
): IDbWorkspaceImageData | IDbWorkspaceVideoData {
  const itemType: CanAccessWorkspaceItemType = that.reflector.get(
    ITEM_TYPE_METADATA,
    context.getHandler(),
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

  const items: (IDbWorkspaceImageData | IDbWorkspaceVideoData)[] =
    parseCollectionToArray(collection);

  if (isItemByFileName(context, that)) {
    // The route acts on the image named by its stored file name in the body. Any id in the
    // query or params is ignored here: otherwise a caller could point the check at another,
    // unrestricted image while the handler still acts on the file name.
    const fullFileName = req.body?.fullFileName;
    if (typeof fullFileName !== 'string' || fullFileName === '') {
      return undefined;
    }
    return items.find((x) => x?.refName === fullFileName);
  }

  return items.find((x) => x.id === itemId);
}

export const evaluateAccess = (
  item: IDbWorkspaceImageData | IDbWorkspaceVideoData | IWorkspaceFolder,
  workspace: IWorkspace,
  user: IUser,
  requiredAccessLevel: PermissionAccessEnum,
) => {
  let hasAccessByTeam: boolean;
  let hasAccessByMember: boolean;
  const workspaceUser = workspace.members.find((x) => x.id === user.id);

  if (item.access.teams) {
    hasAccessByTeam = parseCollectionToArray(workspaceUser?.teams).some(
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
        }),
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
      },
    );
  }

  const workspaceHasTeams = parseCollectionToArray(workspace.teams).length > 0;
  const teamsListed = parseCollectionToArray(item.access.teams).length > 0;

  // Permissions that list teams only: only members of a listed team (with a sufficient level)
  // and the workspace admin get in. Other workspace members must not.
  if (hasAccessByMember === undefined && teamsListed) {
    return hasAccessByTeam || user.id === workspace.admin;
  }

  // Permissions that list neither teams nor members keep the previous result.
  if (hasAccessByMember === undefined && workspaceHasTeams) {
    return true;
  }

  return hasAccessByTeam || hasAccessByMember;
};
