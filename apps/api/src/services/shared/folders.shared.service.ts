import { Injectable } from '@nestjs/common';
import { DbFolderDataRaw, IDbFolder } from '../../interfaces/IEditorImage';
import { IDataResponse, ItemType } from '../../interfaces/_types';
import * as admin from 'firebase-admin';
import { DbVideoData } from '../../interfaces/IEditorVideo';
import { getDataFromDB, parseCollectionToArray } from '../utils/helpers';
import { IWorkspaceFolder } from '../../module/workspace/Interfaces/Folders';
import { IFavoriteFolders, SingleFavFolder } from '../../interfaces/Folders';
import { dbEndpoints } from './shared.service';
import { sendError, sendResponse } from '../utils/sendResponse';

@Injectable()
export class FoldersSharedService {
  constructor() {}

  parseFoldersFromDb(folders: { [key: string]: DbFolderDataRaw }): IDbFolder[] {
    const entries = Object.entries(folders);
    const parsedFolders = entries.reduce(
      (
        acc: IDbFolder[],
        [id, folder]: [id: string, folder: DbFolderDataRaw],
      ) => {
        const item: IDbFolder = { ...folder, id };

        acc.push(item);
        return acc;
      },
      [],
    );

    return parsedFolders;
  }

  async populateFolderChildren(
    uid: string,
    folder: DbFolderDataRaw | IDbFolder,
    itemType: ItemType,
  ): Promise<DbFolderDataRaw> {
    const db = admin.database();
    const children = folder.children;
    const populatedChildren: IDbFolder[] = [];
    const folderString = itemType === 'image' ? 'folders' : 'videoFolders';

    if (children) {
      await Promise.allSettled(
        children.map(async (folderId) => {
          const folderRef = db.ref(`users/${uid}/${folderString}/${folderId}`);
          const folderSnap = await folderRef.get();
          const folderVal = folderSnap.val();

          populatedChildren.push({ ...folderVal, id: folderId });
        }),
      );
    }
    return { ...folder, children: populatedChildren };
  }

  async mapDbFoldersToTreeArray(
    uid: string,
    initial: boolean,
    itemType: ItemType,
    folders: IDbFolder[],
    nestLevel?: number,
  ): Promise<IDbFolder[]> {
    let foldersResult: IDbFolder[] = folders;
    const nestLevelToCut = nestLevel ? nestLevel : 0;

    if (folders && initial) {
      const reversedArray: any = folders.reverse();
      foldersResult = reversedArray.filter(
        (x) => x.nestLevel === nestLevelToCut,
      );
    }

    for (let i = 0; i < foldersResult?.length; i += 1) {
      if (foldersResult[i].nestLevel >= 2) {
        return foldersResult;
      }
      if (foldersResult[i].children && foldersResult[i].children.length > 0) {
        const populatedFolder = await this.populateFolderChildren(
          uid,
          foldersResult[i],
          itemType,
        );
        foldersResult[i].children = await this.mapDbFoldersToTreeArray(
          uid,
          false,
          itemType,
          populatedFolder.children as IDbFolder[],
        );
      }
    }

    return foldersResult;
  }

  findFoldersToDeleteIds(
    folder: IDbFolder | DbFolderDataRaw,
    folderId: string,
    idsProps?: string[],
  ) {
    const ids: string[] = idsProps || [folderId];

    if (folder.children) {
      const children = folder.children as IDbFolder[];
      for (let i = 0; i < children.length; i += 1) {
        ids.push(children[i].id);
        this.findFoldersToDeleteIds(children[i], children[i].id, ids);
      }
    }

    return ids;
  }

  // idk i havent written this to accept workspace folders too, probably had a reason.
  // TODO: maybe add worspace logic here too if similar
  async deleteImageVideoFolders(
    uid: string,
    folderId: string,
    itemType: ItemType,
    forceRemove?: boolean,
  ) {
    try {
      const foldersString = itemType === 'image' ? 'folders' : 'videoFolders';
      const filesString = itemType === 'image' ? 'screenshots' : 'videos';
      const db = admin.database();
      const foldersRef = db.ref(`users/${uid}/${foldersString}`);
      const foldersSnap = await foldersRef.get();
      const foldersVal = foldersSnap.val();
      const filesRef = db.ref(`users/${uid}/${filesString}`);
      const filesSnap = await filesRef.get();
      const filesVal: DbVideoData[] | null = filesSnap.val();

      if (foldersVal) {
        const folders = this.parseFoldersFromDb(foldersVal);
        const rawFolderData = folders.find((x) => x.id === folderId);
        const populatedFolders = await this.mapDbFoldersToTreeArray(
          uid,
          true,
          itemType,
          folders,
          rawFolderData.nestLevel,
        );
        const folderToDelete = populatedFolders.find((x) => x.id === folderId);
        const idsToDelete = this.findFoldersToDeleteIds(
          folderToDelete,
          rawFolderData.id,
        );

        if (filesVal) {
          idsToDelete.forEach((x) => {
            if (filesVal[x]) {
              delete filesVal[x];
            }
          });
        }

        const foldersObj = folders
          .map((x) => {
            if (Array.isArray(x.children)) {
              const parentIndex = x.children.findIndex(
                (y) => y === rawFolderData.id,
              );

              if (parentIndex !== -1) {
                x.children.splice(parentIndex, 1);
              }
            }

            return x;
          })
          .filter((x) => !idsToDelete.some((y) => y === x.id))
          .reduce((acc, val) => {
            const id = val.id;
            acc[id] = val;

            return acc;
          }, {});

        await this.addRemoveFavoriteService(
          uid,
          folderId,
          itemType,
          undefined,
          forceRemove,
        );
        if (folders && filesVal) {
          await Promise.all([
            foldersRef.set(foldersObj),
            filesRef.set(filesVal),
          ]);
        }
      }
    } catch (e) {
      console.log(e);
      return sendError('Error while trying to delete folders');
    }
  }

  // TODO: A lot of almost repeating code. I believe this one can be optimized when needed
  async addRemoveFavoriteService(
    uid: string,
    folderId: string,
    itemType?: ItemType,
    workspaceId?: string,
    forceRemove?: boolean,
  ): Promise<IFavoriteFolders> {
    const db = admin.database();
    const favFoldersRef = db.ref(`users/${uid}/favoriteFolders`);
    const favFoldersSnap = await favFoldersRef.get();
    let favFolders: IFavoriteFolders = favFoldersSnap.val();
    favFolders = {
      images: [],
      videos: [],
      workspaces: {},
      ...favFolders,
    };

    if (workspaceId) {
      const { value: folder, ref: folderRef } =
        await getDataFromDB<IWorkspaceFolder | null>(
          `workspaces/${workspaceId}/folders/${folderId}`,
        );

      const parsedWorkspaceFavs: SingleFavFolder[] = parseCollectionToArray(
        favFolders?.workspaces[workspaceId],
      );
      const favFolderIndex = parsedWorkspaceFavs.findIndex(
        (x) => x.id === folderId,
      );

      if (favFolderIndex === -1 && !forceRemove) {
        favFolders.workspaces[workspaceId] = {
          ...favFolders.workspaces[workspaceId],
          [folderId]: {
            name: folder.name,
            id: folderId,
          },
        };

        if (!folder.isFavoredBy || folder.isFavoredBy?.some((x) => x !== uid)) {
          folder.isFavoredBy = [
            ...parseCollectionToArray(folder.isFavoredBy),
            uid,
          ];
        }
      } else {
        if (
          favFolders.workspaces[workspaceId] &&
          favFolders.workspaces[workspaceId][folderId]
        ) {
          delete favFolders.workspaces[workspaceId][folderId];
        }

        if (folder?.isFavoredBy) {
          folder.isFavoredBy = folder.isFavoredBy.filter((x) => x !== uid);
        }
      }

      await folderRef.set(folder);
    } else {
      const folderCollection = dbEndpoints.foldersCollection[itemType];
      const folderRef = db.ref(`users/${uid}/${folderCollection}/${folderId}`);
      const folderSnap = await folderRef.get();
      const folder: IDbFolder = folderSnap.val();

      if (!folder && !forceRemove) {
        throw 'No such folder.';
      }

      if (itemType === 'image') {
        const parsedFavImages = parseCollectionToArray(favFolders.images);
        const favImagesIndex = parsedFavImages.findIndex(
          (x) => x.id === folderId,
        );

        favImagesIndex === -1 && !forceRemove
          ? (favFolders.images = {
              ...favFolders.images,
              [folderId]: {
                name: folder.name,
                id: folderId,
              },
            })
          : delete favFolders.images[folderId];
      } else {
        const parsedFavVideos = parseCollectionToArray(favFolders.videos);
        const favVideosIndex = parsedFavVideos.findIndex(
          (x) => x.id === folderId,
        );

        favVideosIndex === -1 && !forceRemove
          ? (favFolders.videos = {
              ...favFolders.videos,
              [folderId]: {
                name: folder.name,
                id: folderId,
              },
            })
          : delete favFolders.videos[folderId];
      }
    }

    await favFoldersRef.set(favFolders);

    return favFolders;
  }

  async addRemoveFavFolder(
    uid: string,
    folderId: string,
    itemType?: ItemType,
    workspaceId?: string,
    forceRemove?: boolean,
  ) {
    try {
      const favFolders = await this.addRemoveFavoriteService(
        uid,
        folderId,
        itemType,
        workspaceId,
        forceRemove,
      );
      return sendResponse<IFavoriteFolders>(favFolders);
    } catch (e) {
      console.log(e);
      sendError(e || 'Error while trying to operate favorite folder.');
    }
  }

  async getUserFavFolders(
    uid: string,
  ): Promise<IDataResponse<IFavoriteFolders | null>> {
    const db = admin.database();
    const favFoldersRef = db.ref(`users/${uid}/favoriteFolders`);
    const favFoldersSnap = await favFoldersRef.get();
    const favFolders: IFavoriteFolders = favFoldersSnap.val() || {
      images: {},
      videos: {},
      workspaces: {},
    };

    return sendResponse<IFavoriteFolders>(favFolders);
  }
}
