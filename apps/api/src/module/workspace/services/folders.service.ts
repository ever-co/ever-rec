import { IDataResponse, PermissionsItemType } from '../../../interfaces/_types';
import { IWorkspace, PermissionAccessEnum } from '../Interfaces/Workspace';
import { nanoid } from 'nanoid';
import { WorkspaceUtilitiesService } from './utilities.service';
import { IWorkspaceFolder } from '../Interfaces/Folders';
import { Injectable } from '@nestjs/common';
import {
  getDataFromDB,
  parseCollectionToArray,
  parseCollectionToIdValueObj,
  promiseAllSettled,
} from '../../../services/utils/helpers';
import { WorkspacesService } from './workspace.service';
import { FoldersSharedService } from '../../../services/shared/folders.shared.service';
import { IFavoriteFolders } from '../../../interfaces/Folders';
import * as admin from 'firebase-admin';
import { SharedService } from '../../../services/shared/shared.service';
import { sendError, sendResponse } from '../../../services/utils/sendResponse';
import {
  IDbWorkspaceImageData,
  IDbWorkspaceVideoData,
} from '../Interfaces/Files';
import { equal } from 'assert';
import { WorkspaceSharedService } from './shared.service';
import { canAccessFolderById, evaluateAccess } from '../guards/utils';
import { IUser } from 'src/interfaces/IUser';
import { planFolderMove } from './folder-move';
import { changeWorkspaceFolders } from './change-workspace-collection';

// The first of the collections that holds `itemId` as an item. Own keys only: an id such as
// `constructor` or `toString` is found on every plain object, and must not count as an item.
function findOwnItem(
  collections: Record<string, any>[],
  itemId: string,
): { collection: Record<string, any>; item: any } | undefined {
  for (const collection of collections) {
    const item = Object.prototype.hasOwnProperty.call(collection, itemId)
      ? collection[itemId]
      : undefined;
    if (item && typeof item === 'object') {
      return { collection, item };
    }
  }
  return undefined;
}

@Injectable()
export class WorkspaceFoldersService {
  constructor(
    private readonly utilitiesService: WorkspaceUtilitiesService,
    private readonly foldersSharedService: FoldersSharedService,
  ) {
    // left blank intentionally
  }

  async createWorkspaceFolder(
    uid: string,
    workspaceId: string,
    name: string,
    color: string,
    nestLevel: number,
    parentId: string | false = false,
  ): Promise<IDataResponse<IWorkspaceFolder[] | null>> {
    try {
      // Throws for a workspace that does not exist, so no folder list is written for it.
      await this.utilitiesService.getWorkspaceById(workspaceId);
      const newNestLevel = parentId === false ? 0 : nestLevel + 1;

      if (newNestLevel > 2) {
        return sendError('Maximum folder nest level exceeded.');
      }

      const created = new Date().toISOString();
      const id = nanoid(28);
      const newFolder: IWorkspaceFolder = {
        id,
        creator: uid,
        isPublic: false,
        name,
        parentId,
        created,
        updated: created,
        items: 0,
        children: [],
        rootFolderId: false,
        nestLevel: newNestLevel,
        color,
      };
      const result = await changeWorkspaceFolders(workspaceId, (folders) => ({
        items: [...folders, newFolder],
      }));

      if (result.ok === false) {
        return sendError(
          result.message || 'Error while trying to add workspace folder.',
        );
      }

      return sendResponse<IWorkspaceFolder[]>(result.items);
    } catch (e) {
      console.log(e);
      return sendError(
        e.message || 'Error while trying to add workspace folder.',
      );
    }
  }

  async updateFolderData(
    uid: string,
    workspaceId: string,
    folderId: string,
    changes: Pick<Partial<IWorkspaceFolder>, 'name' | 'color'>,
  ): Promise<
    IDataResponse<{ folders: IWorkspaceFolder[]; favFolders } | null>
  > {
    try {
      const { db } = await this.utilitiesService.getWorkspaceById(workspaceId);
      const favFoldersRef = db.ref(`users/${uid}/favoriteFolders`);
      const favFoldersSnap = await favFoldersRef.get();
      const favFolders = favFoldersSnap.val();

      const result = await changeWorkspaceFolders(workspaceId, (stored) => {
        const folderIndex = stored.findIndex((x) => x.id === folderId);

        if (folderIndex === -1) {
          return { error: 'Folder not found.' };
        }

        // Only the approved fields change; the stored folder keeps everything else, `access`
        // included (permissions are changed on their own route) and the item count the server
        // keeps.
        const changedFolder: IWorkspaceFolder = { ...stored[folderIndex] };
        for (const key of ['name', 'color'] as const) {
          if (changes?.[key] !== undefined && changes[key] !== null) {
            (changedFolder as any)[key] = changes[key];
          }
        }
        stored[folderIndex] = changedFolder;

        return { items: stored };
      });

      if (result.ok === false) {
        return sendError(
          result.message || 'Error while trying to update workspace folder.',
        );
      }

      const folders = result.items;
      const updatedFolder = folders.find((x) => x.id === folderId);

      const parsedFavWorkspaceFolders = favFolders?.workspaces
        ? parseCollectionToArray(favFolders.workspaces[workspaceId])
        : [];
      const favFolderIndex = parsedFavWorkspaceFolders.findIndex(
        (x) => x.id === folderId,
      );

      if (favFolderIndex !== -1) {
        parsedFavWorkspaceFolders[favFolderIndex].name = updatedFolder.name;
      }

      await favFoldersRef.set(favFolders);

      return sendResponse<{
        folders: IWorkspaceFolder[];
        favFolders;
      }>({ folders, favFolders });
    } catch (e) {
      console.log(e);
      return sendError(
        e.message || 'Error while trying to update workspace folder.',
      );
    }
  }

  // Moves a folder, with its subfolders and items, under another folder or to the top level.
  async moveFolder(
    workspaceId: string,
    folderId: string,
    newParentId: string | false,
  ): Promise<IDataResponse<IWorkspaceFolder[] | null>> {
    try {
      const result = await changeWorkspaceFolders(workspaceId, (folders) => {
        const plan = planFolderMove(folders, folderId, newParentId);

        if (!plan.ok) {
          return { error: plan.message };
        }

        return plan.changed ? { items: plan.folders } : {};
      });

      if (result.ok === false) {
        return sendError(
          result.message || 'Error while trying to move workspace folder.',
        );
      }

      return sendResponse<IWorkspaceFolder[]>(result.items);
    } catch (e) {
      console.log(e);
      return sendError('Error while trying to move workspace folder.');
    }
  }

  async deleteFolder(
    uid: string,
    workspaceId: string,
    folderId: string,
    currentFolderId: string | false,
  ): Promise<
    IDataResponse<(IWorkspace & { favFolders: IFavoriteFolders }) | null>
  > {
    try {
      const { workspaceVal, workspaceRef } =
        await this.utilitiesService.getWorkspaceById(workspaceId);
      const screenshots = parseCollectionToArray(workspaceVal.screenshots);
      const videos = parseCollectionToArray(workspaceVal.videos);

      const favFolders =
        await this.foldersSharedService.addRemoveFavoriteService(
          uid,
          folderId,
          undefined,
          workspaceId,
          true,
        );

      // The folder and its subfolders leave the stored folder list in one transaction. Their items
      // move to the top level, so they no longer count in the folders above the deleted one.
      let deletedFolders: IWorkspaceFolder[] = [];
      const result = await changeWorkspaceFolders(workspaceId, (folders) => {
        // The stored parent, not `currentFolderId` from the request: the folder may have been
        // moved meanwhile, and the counts to lower are those of the folders above it now.
        const parentId =
          folders.find((x) => x.id === folderId)?.parentId || false;
        const removed = this.utilitiesService.removeChildFoldersRecursive(
          folders,
          [folderId],
        );
        deletedFolders = removed.deletedFolders;
        const removedIds = deletedFolders.map((x) => x.id);
        const movedItems = [...screenshots, ...videos].filter((x) =>
          removedIds.includes(x?.parentId),
        ).length;

        // Recursively remove item count based on removed items
        return {
          items: this.utilitiesService.changeFolderItemCountRecursive(
            removed.updatedFolders,
            parentId,
            0 - movedItems,
          ),
        };
      });

      if (result.ok === false) {
        return sendError(
          result.message || 'Error while trying to delete workspace folder.',
        );
      }

      const updatedFolders = result.items;

      // Remove parentId of items from deletedFolders
      const deletedFolderIds = await promiseAllSettled(
        deletedFolders.map(async (deletedFolder) => {
          if (deletedFolder.isFavoredBy) {
            await promiseAllSettled(
              deletedFolder.isFavoredBy.map(async (favUserId) => {
                const { ref: folderRef } = await getDataFromDB(
                  `/users/${favUserId}/favoriteFolders/workspaces/${workspaceId}/${deletedFolder.id}`,
                );
                await folderRef.set(null);
              }),
            );
          }
          return deletedFolder.id;
        }),
      );

      // The items move from the lists stored now, not the ones read above: an item uploaded into a
      // deleted folder meanwhile would keep a folder that is gone. Only their `parentId` is
      // written: a write of the whole lists would undo every item added, changed or deleted.
      const [storedScreenshots, storedVideos] = await Promise.all([
        workspaceRef.child('screenshots').get(),
        workspaceRef.child('videos').get(),
      ]);
      const movedItems: Record<string, false> = {};
      const updatedScreenshots = parseCollectionToArray(
        storedScreenshots.val(),
      ).map((screenshot) => {
        if (deletedFolderIds.includes(screenshot.parentId)) {
          movedItems[`screenshots/${screenshot.id}/parentId`] = false;
          return { ...screenshot, parentId: false };
        }
        return screenshot;
      });

      const updatedVideos = parseCollectionToArray(storedVideos.val()).map(
        (video) => {
          if (deletedFolderIds.includes(video.parentId)) {
            movedItems[`videos/${video.id}/parentId`] = false;
            return { ...video, parentId: false };
          }
          return video;
        },
      );

      if (Object.keys(movedItems).length > 0) {
        await workspaceRef.update(movedItems);
      }

      const updatedWorkspace = await this.utilitiesService.parseWorkspaceItems({
        ...workspaceVal,
        folders: updatedFolders,
        screenshots: updatedScreenshots.filter(
          (x) => x.parentId === currentFolderId,
        ),
        videos: updatedVideos.filter((x) => x.parentId === currentFolderId),
      });

      return sendResponse<IWorkspace & { favFolders: IFavoriteFolders }>({
        ...updatedWorkspace,
        favFolders,
      });
    } catch (e) {
      console.log(e);
      return sendError(
        e.message || 'Error while trying to delete workspace folder.',
      );
    }
  }

  async moveItemsToFolder(
    user: IUser,
    workspaceId: string,
    itemIds: string[],
    toMoveFolderId: string | false,
    fromFolderId: string | false,
  ): Promise<IDataResponse<IWorkspace | null>> {
    try {
      const { workspaceVal, workspaceRef } =
        await this.utilitiesService.getWorkspaceById(workspaceId);

      // This makes sure even if we have no videos/images in workspace (undefined)
      // we can work with empty object, or if it comes as array from db (old way, I don't know if there is any left)
      // it will be converted to object for us to work with.
      const screenshots = parseCollectionToIdValueObj(workspaceVal.screenshots);
      const videos = parseCollectionToIdValueObj(workspaceVal.videos);
      // Only the `parentId` of the moved items is written, and the folder counts in one
      // transaction: a write of the whole workspace read above would undo every change made
      // meanwhile, a member removed or a folder taken away from a member included.
      const movedItems: Record<string, string | false> = {};

      for (let i = 0; i < itemIds.length; i++) {
        const itemId = itemIds[i];
        const found = findOwnItem([screenshots, videos], itemId);

        // An id that is in neither collection is not moved: writing to it would create an item
        // that holds only a `parentId`, and change the folder counts for something that is not there.
        if (!found) {
          return sendError('Item not found.');
        }
        const { collection, item } = found;
        const collectionName =
          collection === screenshots ? 'screenshots' : 'videos';

        let hasAccess =
          workspaceVal?.admin === user?.id || item?.uid === user?.id;

        if (item?.access && !hasAccess) {
          hasAccess = evaluateAccess(
            item,
            workspaceVal,
            user,
            PermissionAccessEnum.WRITE,
          );
        }

        // Moving an item out of a folder changes that folder: the user needs WRITE on the folder
        // the item is in now (its stored `parentId`, not `fromFolderId` from the body), as on the
        // single-data route. The destination is checked by the folder guard on the route.
        if (
          hasAccess &&
          !canAccessFolderById(
            item?.parentId,
            workspaceVal,
            user,
            PermissionAccessEnum.WRITE,
          )
        ) {
          hasAccess = false;
        }

        if (hasAccess) {
          collection[itemId] = {
            ...item,
            parentId: toMoveFolderId,
          };
          movedItems[`${collectionName}/${itemId}/parentId`] = toMoveFolderId;
        } else {
          return sendError('Insuffucient permissions');
        }
      }

      const counted = await changeWorkspaceFolders(workspaceId, (stored) => {
        let folders = stored;
        for (let i = 0; i < itemIds.length; i++) {
          // Recursively add item count to parent folders
          folders = this.utilitiesService.changeFolderItemCountRecursive(
            folders,
            toMoveFolderId,
            1,
          );

          // Recursively remove item count to parent folders
          folders = this.utilitiesService.changeFolderItemCountRecursive(
            folders,
            fromFolderId,
            -1,
          );
        }

        return { items: folders };
      });

      if (counted.ok === false) {
        return sendError('Error while trying to move items to new folder.');
      }

      if (Object.keys(movedItems).length > 0) {
        await workspaceRef.update(movedItems);
      }

      const updatedWorkspace = {
        ...workspaceVal,
        folders: counted.items,
        screenshots,
        videos,
      };

      const parsedWorkspace =
        await this.utilitiesService.parseWorkspaceItems(updatedWorkspace);

      return sendResponse(parsedWorkspace);
    } catch (e) {
      console.log(e);
      return sendError('Error while trying to move items to new folder.');
    }
  }
}
