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
import * as admin from 'firebase-admin';
import { PermissionAccessEnum } from 'src/module/workspace/Interfaces/Workspace';
import {
  dbEndpoints,
  PermissionCollectionType,
} from 'src/services/shared/shared.service';
import {
  parseCollectionToArray,
  parseCollectionToIdValueObj,
} from 'src/services/utils/helpers';
import { sendError, sendResponse } from 'src/services/utils/sendResponse';

@Injectable()
export class WorkspaceSharedService {
  async updatePermissions(
    id: string,
    workspaceId: string,
    itemId: string,
    permissionItemType: PermissionsItemType,
    write: boolean,
    read: boolean,
    permissionType: 'member' | 'team'
  ): Promise<
    IDataResponse<{
      item: IDbWorkspaceImageData | IDbWorkspaceVideoData | IWorkspaceFolder;
      permissionsItemType: PermissionsItemType;
    } | null>
  > {
    try {
      const db = admin.database();
      const itemsRef = db.ref(
        `workspaces/${workspaceId}/${permissionItemType}`
      );
      const itemsSnap = await itemsRef.get();
      const itemsVal: IWorkspaceFolder[] = parseCollectionToArray(
        itemsSnap.val()
      );

      const { collection, item } =
        permissionType === 'member'
          ? await this.updateMemberPermissions(
              itemsVal,
              itemId,
              id,
              write,
              read
            )
          : await this.updateTeamPermissions(itemsVal, itemId, id, write, read);

      const reversedItems = parseCollectionToIdValueObj(collection);

      itemsRef.set(reversedItems);

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
    collection: PermissionCollectionType
  ): {
    collection: PermissionCollectionType;
    itemIndex: number;
    access: PermissionAccessEnum;
  } => {
    const access = write
      ? PermissionAccessEnum.WRITE
      : PermissionAccessEnum.READ;
    const itemIndex = collection.findIndex(x => x.id === itemId);

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
  async updateMemberPermissions(
    collectionProp: PermissionCollectionType,
    itemId: string | false,
    uid: string,
    write: boolean,
    read: boolean
  ): Promise<{
    collection: PermissionCollectionType;
    item: IDbWorkspaceImageData | IDbWorkspaceVideoData | IWorkspaceFolder;
  }> {
    const { collection, itemIndex, access } =
      this.initializePermissionsMetadata(write, itemId, collectionProp);

    if (collection[itemIndex].access?.members) {
      const userIndex = collection[itemIndex].access.members.findIndex(
        x => x.uid === uid
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

  async updateTeamPermissions(
    collectionProp: PermissionCollectionType,
    itemId: string | false,
    teamId: string,
    write: boolean,
    read: boolean
  ): Promise<{
    collection: PermissionCollectionType;
    item: IDbWorkspaceImageData | IDbWorkspaceVideoData | IWorkspaceFolder;
  }> {
    const { collection, itemIndex, access } =
      this.initializePermissionsMetadata(write, itemId, collectionProp);

    if (collection[itemIndex].access?.teams) {
      const teamIndex = collection[itemIndex].access.teams.findIndex(
        x => x.teamId === teamId
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
