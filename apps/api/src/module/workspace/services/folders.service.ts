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
import {
  MAX_FOLDER_NEST_LEVEL,
  nestLevelUnder,
  planFolderMove,
} from './folder-move';
import {
  changeWorkspaceFolders,
  moveWorkspaceItem,
} from './change-workspace-collection';

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

      const created = new Date().toISOString();
      const id = nanoid(28);
      // The level comes from the stored parent, not from the `nestLevel` of the request (still
      // accepted, for older clients): a wrong one would put a folder deeper than the limit, and a
      // parent that is not stored would leave a folder no list shows.
      const result = await changeWorkspaceFolders(workspaceId, (folders) => {
        const newNestLevel = nestLevelUnder(folders, parentId);

        if (newNestLevel === undefined) {
          return { error: 'Parent folder not found.' };
        }
        if (newNestLevel > MAX_FOLDER_NEST_LEVEL) {
          return { error: 'Maximum folder nest level exceeded.' };
        }

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
        return { items: [...folders, newFolder] };
      });

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
        const deletedFolder = folders.find((x) => x.id === folderId);
        const parentId = deletedFolder?.parentId || false;
        // The folder's stored count, which includes its subfolders, as a folder move uses it: not
        // the items read above, since an item uploaded into the folder or moved out of it meanwhile
        // has already changed the counts in its own transaction.
        const movedItems =
          typeof deletedFolder?.items === 'number' &&
          Number.isFinite(deletedFolder.items)
            ? deletedFolder.items
            : 0;
        const removed = this.utilitiesService.removeChildFoldersRecursive(
          folders,
          [folderId],
        );
        deletedFolders = removed.deletedFolders;

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
      // deleted folder meanwhile would keep a folder that is gone. Each one moves to the top level
      // in a transaction of its own, and only while it is still stored in a deleted folder: a write
      // of the `parentId`s read here would bring back an item deleted since as one that holds only
      // a `parentId`, and undo a move made since, so the folder it went to would count an item it
      // does not hold.
      const [storedScreenshots, storedVideos] = await Promise.all([
        workspaceRef.child('screenshots').get(),
        workspaceRef.child('videos').get(),
      ]);
      const screenshots = parseCollectionToIdValueObj(storedScreenshots.val());
      const videos = parseCollectionToIdValueObj(storedVideos.val());
      const toMove: Array<{
        collection: Record<string, any>;
        collectionName: 'screenshots' | 'videos';
        itemId: string;
      }> = [];
      for (const [collectionName, collection] of [
        ['screenshots', screenshots],
        ['videos', videos],
      ] as const) {
        for (const [itemId, item] of Object.entries<any>(collection)) {
          if (item && deletedFolderIds.includes(item.parentId)) {
            toMove.push({ collection, collectionName, itemId });
          }
        }
      }

      const moves = await Promise.all(
        toMove.map(({ collectionName, itemId }) =>
          moveWorkspaceItem(
            workspaceId,
            collectionName,
            itemId,
            false,
            deletedFolderIds,
          ),
        ),
      );
      // The answer shows each moved item as it is stored now, and not one deleted meanwhile.
      toMove.forEach(({ collection, itemId }, i) => {
        const move = moves[i];
        if (move.ok === false) {
          return;
        }
        if (move.item) {
          collection[itemId] = move.item;
        } else {
          delete collection[itemId];
        }
      });

      // A move that did not commit leaves its item where it was (its entry above is not the stored
      // one, so nothing of the lists is answered). The moves that did commit stay: each is right on
      // its own, and an item moved out of a folder that is gone is what the delete is for.
      if (moves.some((move) => move.ok === false)) {
        return sendError('Error while trying to delete workspace folder.');
      }

      const updatedWorkspace = await this.utilitiesService.parseWorkspaceItems({
        ...workspaceVal,
        folders: updatedFolders,
        screenshots: parseCollectionToArray(screenshots).filter(
          (x) => x.parentId === currentFolderId,
        ),
        videos: parseCollectionToArray(videos).filter(
          (x) => x.parentId === currentFolderId,
        ),
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

  /**
   * Moves the items `itemIds` into the folder `toMoveFolderId`. Each item is counted out of the
   * folder it is stored in, not out of the `fromFolderId` a client sends (still accepted by the
   * route, for older clients): that one may be wrong, or out of date after a move made meanwhile.
   */
  async moveItemsToFolder(
    user: IUser,
    workspaceId: string,
    itemIds: string[],
    toMoveFolderId: string | false,
  ): Promise<IDataResponse<IWorkspace | null>> {
    try {
      const { workspaceVal } =
        await this.utilitiesService.getWorkspaceById(workspaceId);

      // This makes sure even if we have no videos/images in workspace (undefined)
      // we can work with empty object, or if it comes as array from db (old way, I don't know if there is any left)
      // it will be converted to object for us to work with.
      const screenshots = parseCollectionToIdValueObj(workspaceVal.screenshots);
      const videos = parseCollectionToIdValueObj(workspaceVal.videos);
      // Only the moved items are written, each in a transaction of its own, and the folder counts
      // in one transaction: a write of the whole workspace read above would undo every change made
      // meanwhile, a member removed or a folder taken away from a member included.
      const toMove: Array<{
        collection: Record<string, any>;
        collectionName: 'screenshots' | 'videos';
        itemId: string;
      }> = [];

      // Each item once, however often the request names it.
      for (const itemId of new Set(itemIds)) {
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
          toMove.push({ collection, collectionName, itemId });
        } else {
          return sendError('Insuffucient permissions');
        }
      }

      // Each item changes folder in a transaction of its own, which answers the folder it was in:
      // two moves of one item at the same time each see where the other left it, and an item
      // deleted meanwhile is not written.
      const moves = await Promise.all(
        toMove.map(({ collectionName, itemId }) =>
          moveWorkspaceItem(
            workspaceId,
            collectionName,
            itemId,
            toMoveFolderId,
          ),
        ),
      );
      const movedFrom: Array<string | false> = [];
      toMove.forEach(({ collection, itemId }, i) => {
        const move = moves[i];
        if (move.ok === false) {
          return;
        }
        if (move.moved) {
          movedFrom.push(move.from);
        }
        if (move.item) {
          collection[itemId] = move.item;
        } else {
          delete collection[itemId];
        }
      });

      // Only the items whose folder changed count: out of the folder each one was in, into the
      // destination. Nothing changed, nothing is written.
      const counted = await changeWorkspaceFolders(workspaceId, (stored) => {
        if (movedFrom.length === 0) {
          return {};
        }
        let folders = stored;
        for (const from of movedFrom) {
          // Recursively add item count to parent folders
          folders = this.utilitiesService.changeFolderItemCountRecursive(
            folders,
            toMoveFolderId,
            1,
          );

          // Recursively remove item count to parent folders
          folders = this.utilitiesService.changeFolderItemCountRecursive(
            folders,
            from,
            -1,
          );
        }

        return { items: folders };
      });

      if (counted.ok === false || moves.some((move) => move.ok === false)) {
        return sendError('Error while trying to move items to new folder.');
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
