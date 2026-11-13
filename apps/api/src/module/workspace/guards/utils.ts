import { ExecutionContext } from '@nestjs/common';
import * as admin from 'firebase-admin';
import {
  IAccess,
  IAccessMember,
  IWorkspace,
  IWorkspaceUser,
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

/**
 * True when the permissions on `item` give `user` `requiredAccessLevel`, by the user's own entry or
 * by a team of the user. An item without permissions is open to every member. Unlike
 * `evaluateAccess`, an item that lists only teams is not open to everyone: a user who is in none of
 * its teams (or whose team has a lower level) gets nothing.
 */
export function hasStrictAccess(
  item: { access?: IAccess },
  workspace: IWorkspace,
  user: IUser,
  requiredAccessLevel: PermissionAccessEnum,
): boolean {
  const access = item.access;
  if (!access) {
    return true;
  }
  const byMember = parseCollectionToArray<IAccessMember>(access.members).some(
    (member) =>
      member?.uid === user.id &&
      evaluateAccessType(member.access, requiredAccessLevel),
  );
  if (byMember) {
    return true;
  }
  const workspaceUser = parseCollectionToArray<IWorkspaceUser>(
    workspace.members,
  ).find((member) => member?.id === user.id);
  const teamIds = parseCollectionToArray<IWorkspaceTeam>(
    workspaceUser?.teams,
  ).map((team) => team?.id);
  return parseCollectionToArray<IAccessTeam>(access.teams).some(
    (team) =>
      teamIds.includes(team?.teamId) &&
      evaluateAccessType(team.access, requiredAccessLevel),
  );
}

/**
 * True when `user` has `requiredAccessLevel` on the folder `folderId`. No folder (`false`, `'false'`
 * or missing) is the workspace root: allowed. A folder that does not exist is refused, and so is
 * any error while evaluating.
 */
export function canAccessFolderById(
  workspace: IWorkspace,
  user: IUser,
  folderId: unknown,
  requiredAccessLevel: PermissionAccessEnum,
): boolean {
  try {
    if (!folderId || folderId === 'false') {
      return true;
    }
    if (user.id === workspace.admin) {
      return true;
    }
    const folder: IWorkspaceFolder = parseCollectionToArray(
      workspace.folders,
    ).find((x: IWorkspaceFolder) => x?.id === folderId);
    if (!folder) {
      return false;
    }
    return hasStrictAccess(folder, workspace, user, requiredAccessLevel);
  } catch (e) {
    console.log(e);
    return false;
  }
}

/**
 * True when `user` may write a workspace video file named `fileName`: no video of the workspace
 * uses that name, or the user has WRITE on every video that does (on the video itself and on the
 * folder it is in). The workspace admin may always. Writing a file under a name owned by another
 * video replaces that video's file, so the check is on the name, not on any id sent with the request.
 */
export function canWriteVideoByName(
  workspace: IWorkspace,
  user: IUser,
  fileName: string,
): boolean {
  try {
    if (user.id === workspace.admin) {
      return true;
    }
    return parseCollectionToArray(workspace.videos)
      .filter((video: IDbWorkspaceVideoData) => video?.refName === fileName)
      .every(
        (video: IDbWorkspaceVideoData) =>
          hasStrictAccess(
            video,
            workspace,
            user,
            PermissionAccessEnum.WRITE,
          ) &&
          canAccessFolderById(
            workspace,
            user,
            video.parentId,
            PermissionAccessEnum.WRITE,
          ),
      );
  } catch (e) {
    console.log(e);
    return false;
  }
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
