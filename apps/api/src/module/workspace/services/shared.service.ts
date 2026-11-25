import { Injectable } from '@nestjs/common';
import {
  IDataResponse,
  ItemType,
  PermissionsItemType,
} from 'src/interfaces/_types';
import {
  IDbWorkspaceImageData,
  IDbWorkspaceVideoData,
} from 'src/module/workspace/Interfaces/Files';
import { IWorkspaceFolder } from 'src/module/workspace/Interfaces/Folders';
import { PermissionAccessEnum } from 'src/module/workspace/Interfaces/Workspace';
import { PermissionCollectionType } from 'src/services/shared/shared.service';
import { sendError, sendResponse } from 'src/services/utils/sendResponse';
import { changeWorkspaceCollection } from './change-workspace-collection';

@Injectable()
export class WorkspaceSharedService {
  async updatePermissions(
    id: string,
    workspaceId: string,
    itemId: string,
    permissionItemType: PermissionsItemType,
    write: boolean,
    read: boolean,
    permissionType: 'member' | 'team',
  ): Promise<
    IDataResponse<{
      item: IDbWorkspaceImageData | IDbWorkspaceVideoData | IWorkspaceFolder;
      permissionsItemType: PermissionsItemType;
    } | null>
  > {
    try {
      // One transaction on the whole list, which the folder writers share: a write of a list read
      // earlier would undo an item count, a folder or another permission changed meanwhile.
      const result = await changeWorkspaceCollection<
        IDbWorkspaceImageData | IDbWorkspaceVideoData | IWorkspaceFolder
      >(workspaceId, permissionItemType, (itemsVal) => {
        if (!itemsVal.some((x) => x.id === itemId)) {
          return { error: 'No such item' };
        }

        const { collection } =
          permissionType === 'member'
            ? this.updateMemberPermissions(
                itemsVal as PermissionCollectionType,
                itemId,
                id,
                write,
                read,
              )
            : this.updateTeamPermissions(
                itemsVal as PermissionCollectionType,
                itemId,
                id,
                write,
                read,
              );

        return { items: collection };
      });

      if (result.ok === false) {
        return sendError('Error while trying to update file permissions');
      }

      const item = result.items.find((x) => x.id === itemId);

      return sendResponse<{
        item: IDbWorkspaceImageData | IDbWorkspaceVideoData | IWorkspaceFolder;
        permissionsItemType: PermissionsItemType;
      }>({
        item,
        permissionsItemType: permissionItemType,
      });
    } catch (e) {
      console.log(e);
      return sendError('Error while trying to update file permissions');
    }
  }

  initializePermissionsMetadata = (
    write: boolean,
    itemId: string | false,
    collection: PermissionCollectionType,
  ): {
    collection: PermissionCollectionType;
    itemIndex: number;
    access: PermissionAccessEnum;
  } => {
    const access = write
      ? PermissionAccessEnum.WRITE
      : PermissionAccessEnum.READ;
    const itemIndex = collection.findIndex((x) => x.id === itemId);

    if (!itemIndex && itemIndex === -1) {
      throw 'No such item';
    }

    collection[itemIndex].access = collection[itemIndex].access || {
      teams: [],
      members: [],
    };

    return { collection, itemIndex, access };
  };

  // TODO: maybe create shared workspace service and start extracting there these shared workspace services.
  // Synchronous: it runs inside the transaction of `updatePermissions`.
  updateMemberPermissions(
    collectionProp: PermissionCollectionType,
    itemId: string | false,
    uid: string,
    write: boolean,
    read: boolean,
  ): {
    collection: PermissionCollectionType;
    item: IDbWorkspaceImageData | IDbWorkspaceVideoData | IWorkspaceFolder;
  } {
    const { collection, itemIndex, access } =
      this.initializePermissionsMetadata(write, itemId, collectionProp);

    if (collection[itemIndex].access?.members) {
      const userIndex = collection[itemIndex].access.members.findIndex(
        (x) => x.uid === uid,
      );

      if (write || read) {
        if (userIndex !== -1) {
          collection[itemIndex].access.members[userIndex].access = access;
        } else {
          collection[itemIndex].access.members.push({ uid, access });
        }
      } else if (!write && !read) {
        if (userIndex !== -1) {
          collection[itemIndex].access.members[userIndex].access =
            PermissionAccessEnum.NONE;
        } else {
          collection[itemIndex].access.members.push({
            uid,
            access: PermissionAccessEnum.NONE,
          });
        }
      }
    } else if (write || read) {
      collection[itemIndex].access = {
        teams: collection[itemIndex].access?.teams || null,
        members: collection[itemIndex].access?.members || [],
      };

      collection[itemIndex].access.members.push({ uid, access });
    } else {
      collection[itemIndex].access.members =
        collection[itemIndex].access.members || [];
      collection[itemIndex].access.members.push({
        uid,
        access: PermissionAccessEnum.NONE,
      });
    }

    return { collection, item: collection[itemIndex] };
  }

  // Synchronous: it runs inside the transaction of `updatePermissions`.
  updateTeamPermissions(
    collectionProp: PermissionCollectionType,
    itemId: string | false,
    teamId: string,
    write: boolean,
    read: boolean,
  ): {
    collection: PermissionCollectionType;
    item: IDbWorkspaceImageData | IDbWorkspaceVideoData | IWorkspaceFolder;
  } {
    const { collection, itemIndex, access } =
      this.initializePermissionsMetadata(write, itemId, collectionProp);

    if (collection[itemIndex].access?.teams) {
      const teamIndex = collection[itemIndex].access.teams.findIndex(
        (x) => x.teamId === teamId,
      );

      if (write || read) {
        if (teamIndex !== -1) {
          collection[itemIndex].access.teams[teamIndex].access = access;
        } else {
          collection[itemIndex].access.teams.push({ teamId, access });
        }
      } else if (!write && !read) {
        if (teamIndex !== -1) {
          collection[itemIndex].access.teams[teamIndex].access =
            PermissionAccessEnum.NONE;
        } else {
          collection[itemIndex].access.teams.push({
            teamId,
            access: PermissionAccessEnum.NONE,
          });
        }
      }
    } else if (write || read) {
      collection[itemIndex].access = {
        teams: collection[itemIndex].access?.teams || [],
        members: collection[itemIndex].access?.members || null,
      };

      collection[itemIndex].access.teams.push({ teamId, access });
    } else {
      collection[itemIndex].access.teams =
        collection[itemIndex].access.teams || [];
      collection[itemIndex].access.teams.push({
        teamId,
        access: PermissionAccessEnum.NONE,
      });
    }

    return { collection, item: collection[itemIndex] };
  }
}
