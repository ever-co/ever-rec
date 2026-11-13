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
import { is_id } from '../validators/id.validator';
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

// Every image of the workspace stored under this file name. More than one is possible, because an
// upload under an existing name adds a record next to the old one.
export function findImagesByFileName(
  workspace: IWorkspace,
  fileName: string,
): IDbWorkspaceImageData[] {
  return parseCollectionToArray<IDbWorkspaceImageData>(
    workspace.screenshots,
  ).filter((x) => x?.refName === fileName);
}

// The stored file name of the caller's own personal image named by `itemId` in the query, which
// `add-from-personal` copies into the workspace under that same name. Undefined when the query
// has no plain id or the caller has no such image (nothing is copied then).
export async function getPersonalImageFileName(
  req: any,
): Promise<string | undefined> {
  const itemId = req.query?.itemId;
  const uid = req.user?.id;
  if (typeof itemId !== 'string' || !is_id(itemId) || !uid) {
    return undefined;
  }
  const snap = await admin
    .database()
    .ref(`users/${uid}/screenshots/${itemId}`)
    .get();
  const refName = snap.val()?.refName;
  return typeof refName === 'string' && refName !== '' ? refName : undefined;
}

// Same rule as `CanAccessItemGuard`: the admin and items without their own permissions pass.
export function canAccessItemData(
  item: IDbWorkspaceImageData | IDbWorkspaceVideoData,
  workspace: IWorkspace,
  user: IUser,
  requiredAccessLevel: PermissionAccessEnum,
): boolean {
  if (user.id === workspace.admin) {
    return true;
  }
  if (item?.access) {
    return !!evaluateAccess(item, workspace, user, requiredAccessLevel);
  }
  return true;
}

// Same rule as `CanAccessFolderGuard`: no folder, the admin and folders without their own
// permissions pass; a folder id that matches no folder does not.
export function canAccessFolderById(
  folderId: unknown,
  workspace: IWorkspace,
  user: IUser,
  requiredAccessLevel: PermissionAccessEnum,
): boolean {
  if (!folderId || folderId === 'false' || user.id === workspace.admin) {
    return true;
  }
  const folder: IWorkspaceFolder | undefined = parseCollectionToArray(
    workspace.folders,
  ).find((x: IWorkspaceFolder) => x?.id === folderId);
  if (!folder) {
    return false;
  }
  if (folder.access) {
    return !!evaluateAccess(folder, workspace, user, requiredAccessLevel);
  }
  return true;
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

  // Someone who is no longer in the workspace (and is not its admin) gets nothing from grants
  // left behind on items or folders.
  if (!workspaceUser && user.id !== workspace.admin) {
    return false;
  }

  if (item.access.teams) {
    // Team membership is stored on the team (`workspace.teams[].members`); a `teams` list on the
    // member entry is read too.
    const userTeams: IWorkspaceTeam[] = [
      ...parseCollectionToArray<IWorkspaceTeam>(workspace.teams).filter(
        (team) =>
          parseCollectionToArray<IWorkspaceUser>(team?.members).some(
            (member) => member?.id === user.id,
          ),
      ),
      ...parseCollectionToArray<IWorkspaceTeam>(workspaceUser?.teams),
    ];
    hasAccessByTeam = userTeams.some((workspaceTeam: IWorkspaceTeam) =>
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
