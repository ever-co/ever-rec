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
import { evaluateAccess } from '../guards/utils';
import { IUser } from 'src/interfaces/IUser';

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
      const { workspaceVal, workspaceRef } =
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
      const updatedFolders = {
        ...workspaceVal.folders,
        [id]: newFolder,
      };

      await workspaceRef.update({ folders: updatedFolders });

      return sendResponse<IWorkspaceFolder[]>(
        parseCollectionToArray(updatedFolders),
      );
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
    updatedFolder: IWorkspaceFolder,
  ): Promise<
    IDataResponse<{ folders: IWorkspaceFolder[]; favFolders } | null>
  > {
    try {
      const { workspaceVal, workspaceRef, db } =
        await this.utilitiesService.getWorkspaceById(workspaceId);
      const favFoldersRef = db.ref(`users/${uid}/favoriteFolders`);
      const favFoldersSnap = await favFoldersRef.get();
      const favFolders = favFoldersSnap.val();
      const folders = parseCollectionToArray(workspaceVal.folders);
      const folderIndex = folders.findIndex((x) => x.id === folderId);

      if (folderIndex === -1) {
        return sendError('Folder not found.');
      }

      folders[folderIndex] = updatedFolder;
      // TODO make sure updatedFolder only changes a set approved values
      //  think about ADMIN, permissions etc

      const parsedFavWorkspaceFolders = favFolders?.workspaces
        ? parseCollectionToArray(favFolders.workspaces[workspaceId])
        : [];
      const favFolderIndex = parsedFavWorkspaceFolders.findIndex(
        (x) => x.id === folderId,
      );

      if (favFolderIndex !== -1) {
        parsedFavWorkspaceFolders[favFolderIndex].name = updatedFolder.name;
      }

      await Promise.all([
        workspaceRef.update({ folders: parseCollectionToIdValueObj(folders) }),
        favFoldersRef.set(favFolders),
      ]);

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

  async deleteFolder(
    uid: string,
    workspaceId: string,
    folderId: string,
    currentFolderId: string | false,
  ): Promise<
    IDataResponse<(IWorkspace & { favFolders: IFavoriteFolders }) | null>
  > {
    try {
      const { workspaceVal, workspaceRef, db } =
        await this.utilitiesService.getWorkspaceById(workspaceId);
      const folders = parseCollectionToArray(workspaceVal.folders);
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

      const { updatedFolders, deletedFolders } =
        this.utilitiesService.removeChildFoldersRecursive(folders, [folderId]);

      // Remove parentId of items from deletedFolders
      let changeCount = 0;
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

      const updatedScreenshots = screenshots.map((screenshot) => {
        if (deletedFolderIds.includes(screenshot.parentId)) {
          changeCount--;
          return { ...screenshot, parentId: false };
        }
        return screenshot;
      });

      const updatedVideos = videos.map((video) => {
        if (deletedFolderIds.includes(video.parentId)) {
          changeCount--;
          return { ...video, parentId: false };
        }
        return video;
      });

      const updatedScreenshotsMap =
        parseCollectionToIdValueObj(updatedScreenshots);
      const updatedVideosMap = parseCollectionToIdValueObj(updatedVideos);

      // Recursively remove item count based on removed items
      this.utilitiesService.changeFolderItemCountRecursive(
        updatedFolders,
        currentFolderId,
        changeCount,
      );

      await workspaceRef.update({
        folders: parseCollectionToIdValueObj(updatedFolders),
        screenshots: updatedScreenshotsMap,
        videos: updatedVideosMap,
      });

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
      let folders = parseCollectionToArray(workspaceVal.folders);

      for (let i = 0; i < itemIds.length; i++) {
        const itemId = itemIds[i];
        const collection = screenshots[itemId] ? screenshots : videos;
        const item = collection[itemId];
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

        if (hasAccess) {
          collection[itemId] = {
            ...item,
            parentId: toMoveFolderId,
          };

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
        } else {
          return sendError('Insuffucient permissions');
        }
      }

      const updatedWorkspace = {
        ...workspaceVal,
        folders,
        screenshots,
        videos,
      };

      await workspaceRef.update(updatedWorkspace);

      const parsedWorkspace = await this.utilitiesService.parseWorkspaceItems(
        updatedWorkspace,
      );

      return sendResponse(parsedWorkspace);
    } catch (e) {
      console.log(e);
      return sendError('Error while trying to move items to new folder.');
    }
  }
}
