import { IDataResponse } from '../../../interfaces/_types';
import { ResStatusEnum } from '../../../enums/ResStatusEnum';
import * as admin from 'firebase-admin';
import { AddToDbProps } from '../Interfaces/AddToDbProps';
import { Injectable } from '@nestjs/common';
import { Reference } from '@firebase/database-types';
import {
  IDbWorkspaceImageData,
  IDbWorkspaceVideoData,
  IWorkspaceImage,
} from '../Interfaces/Files';
import { IWorkspace } from '../Interfaces/Workspace';
import { parseCollectionToArray } from '../../../services/utils/helpers';
import { nanoid } from 'nanoid';
import { IWorkspaceFolder } from '../Interfaces/Folders';
import { IDbFolder } from '../../../interfaces/IEditorImage';
import { Database } from 'firebase-admin/lib/database';
import sharp from 'sharp';
import { IUser, IUserShort } from 'src/interfaces/IUser';

const indexesOf = (propertyValue, propertyName, arr) => {
  const reduced = arr.reduce(function (acc, val, ind, arr) {
    if (val[propertyName] === propertyValue) {
      acc.push(ind);
    }
    return acc;
  }, []);
  return reduced;
};

@Injectable()
export class WorkspaceUtilitiesService {
  private readonly config;

  constructor() {
    this.config = {
      action: 'read',
      expires: '03-01-2500',
    };
  }

  // same as images function. should be extracted.
  async getImageOrItsThumbnailRef(workspaceId: string, fullFileName: string) {
    const bucket = admin.storage().bucket();
    const thumbnailExists = (
      await bucket
        .file(
          `workspaces/${workspaceId}/screenshots/thumbnails/${fullFileName}`
        )
        .exists()
    )[0];
    const imgRef = thumbnailExists
      ? bucket.file(
          `workspaces/${workspaceId}/screenshots/thumbnails/${fullFileName}`
        )
      : bucket.file(`workspaces/${workspaceId}/screenshots/${fullFileName}`);

    return imgRef;
  }

  // TODO: maybe replace these methods functions from sendResponse.ts
  sendError(message: string, error?: any): IDataResponse<null> {
    return {
      status: ResStatusEnum.error,
      message: message,
      error: error || null,
      data: null,
    };
  }

  // TODO: maybe replace these methods functions from sendResponse.ts
  sendResponse<T>(data: T): IDataResponse<T> {
    return {
      status: ResStatusEnum.success,
      message: 'Success!',
      error: null,
      data: data,
    };
  }

  // Makes sure that when there is a change in items count in a subfolder,
  // all its parent folders get their item count updated.
  changeFolderItemCountRecursive(
    folders: (IWorkspaceFolder | IDbFolder)[],
    parentId: string | false = false,
    changeCount = 1
  ) {
    if (parentId === false) {
      return parseCollectionToArray(folders);
    }

    const parentIndex = folders.findIndex(x => x.id === parentId);
    if (parentIndex !== -1) {
      folders[parentIndex] = {
        ...folders[parentIndex],
        items: folders[parentIndex].items + changeCount,
      };
      const newParentId = folders[parentIndex].parentId;

      return this.changeFolderItemCountRecursive(
        folders,
        newParentId,
        changeCount
      );
    } else {
      return this.changeFolderItemCountRecursive(folders, false);
    }
  }

  //! I am sorry for what you're about to see in the method below
  // Removes initial folder and its all child folders from the tree
  removeChildFoldersRecursive(
    folders: (IWorkspaceFolder | IDbFolder)[],
    folderIds: string[] | false = false,
    firstIteration = true,
    deletedFolders: (IWorkspaceFolder | IDbFolder)[] = []
  ) {
    if (folderIds === false) {
      return {
        updatedFolders: parseCollectionToArray(folders),
        deletedFolders,
      };
    }

    // Remove the first folder
    if (firstIteration) {
      const currentFolderIndex = folders.findIndex(x => x.id === folderIds[0]);

      if (currentFolderIndex !== -1) {
        deletedFolders.push(folders[currentFolderIndex]);
        folders.splice(currentFolderIndex, 1);
      }

      return this.removeChildFoldersRecursive(
        folders,
        [folderIds[0]],
        false,
        deletedFolders
      );
    }

    // Run recursion down each child tree
    folderIds.forEach(folderId => {
      const childIndexes = indexesOf(folderId, 'parentId', folders);

      if (childIndexes.length !== 0) {
        const newChildFolderIds = childIndexes.map(index => folders[index].id);

        childIndexes.forEach((childIndex: number, index: number) => {
          if (index === 0) {
            deletedFolders.push(folders[childIndex]);
            folders.splice(childIndex, 1);
            return;
          }

          deletedFolders.push(folders[childIndex - index]);
          folders.splice(childIndex - index, 1);
        });

        return this.removeChildFoldersRecursive(
          folders,
          newChildFolderIds,
          false,
          deletedFolders
        );
      } else {
        return this.removeChildFoldersRecursive(
          folders,
          false,
          false,
          deletedFolders
        );
      }
    });

    return this.removeChildFoldersRecursive(
      folders,
      false,
      false,
      deletedFolders
    );
  }

  async addImageToDb(props: AddToDbProps): Promise<IDbWorkspaceImageData> {
    const db = admin.database();
    const {
      uid,
      title,
      refName,
      folderId,
      workspaceId,
      metadata,
      stage,
      originalImage,
    } = props;
    const id = nanoid(24);
    const newImageRef = db.ref(`workspaces/${workspaceId}/screenshots/${id}`);

    const newImage: IDbWorkspaceImageData = {
      id,
      uid,
      title,
      refName,
      created: metadata.timeCreated,
      parentId: folderId ? folderId : false,
      likes: [],
      views: 0,
      trash: false,
      isPublic: false,
      workspaceIds: [workspaceId],
      stage: stage,
      originalImage: originalImage,
    };

    await newImageRef.set(JSON.parse(JSON.stringify(newImage)));

    return newImage;
  }

  // same as images upload to bucket, only paths different. Should be made one.
  async uploadImageInBucket(
    fileData: string | Express.Multer.File,
    workspaceId: string,
    fullFileName?: string,
    filePath?: string
  ): Promise<any> {
    const bucket = admin.storage().bucket();
    const file = bucket.file(
      filePath || `workspaces/${workspaceId}/screenshots/${fullFileName}`
    );
    const thumbnail = bucket.file(
      `workspaces/${workspaceId}/screenshots/thumbnails/${fullFileName}`
    );
    let fileBuffer: Buffer;

    if (typeof fileData === 'string') {
      const getBase64Data = encoded => {
        const base64EncodedString = encoded.replace(
          /^data:\w+\/\w+;base64,/,
          ''
        );
        return base64EncodedString;
      };
      const photoData = getBase64Data(fileData);
      fileBuffer = Buffer.from(photoData, 'base64');
    } else {
      fileBuffer = fileData.buffer;
    }

    const thumbnailBuffer = await sharp(fileBuffer)
      .resize({
        width: 480,
        height: 270,
        position: 'top',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        withoutEnlargement: true,
      })
      .toBuffer();

    if (fileBuffer && thumbnail) {
      await Promise.all([
        file.save(fileBuffer),
        thumbnail.save(thumbnailBuffer),
      ]);
    }

    return { file, thumbnail };
  }

  async addVideoToDb(
    props: AddToDbProps & { duration: string }
  ): Promise<IDbWorkspaceVideoData> {
    const {
      id,
      uid,
      title,
      refName,
      folderId,
      workspaceId,
      metadata,
      duration,
      streamData,
      chapters,
      chaptersEnabled,
    } = props;
    const db = admin.database();
    const newVideoRef = db.ref(`workspaces/${workspaceId}/videos/${id}`);

    const newVideo: IDbWorkspaceVideoData = {
      id,
      uid,
      title,
      refName,
      duration,
      created: metadata.timeCreated,
      parentId: folderId ? folderId : false,
      likes: [],
      views: 0,
      trash: false,
      isPublic: false,
      workspaceIds: [workspaceId],
      streamData,
      chapters,
      chaptersEnabled,
    };

    await newVideoRef.set(JSON.parse(JSON.stringify(newVideo)));

    return newVideo;
  }

  async parseWorkspaceItems(workspace: IWorkspace): Promise<IWorkspace> {
    const bucket = admin.storage().bucket();

    const videosPromiseParsed = await Promise.allSettled(
      parseCollectionToArray(workspace.videos).map(async videoData => {
        let ref: any | null = null;
        let url: string | null = '';

        try {
          if (videoData?.streamData) {
            url = videoData.streamData.playbackUrl;
          } else {
            const video = bucket.file(
              `workspaces/${workspace.id}/videos/${videoData.refName}`
            );
            ref = (await video.getMetadata())[0];
            url = (await video.getSignedUrl(this.config))[0];
          }
        } catch (e) {
          console.log(e);
          return null;
        }

        return { dbData: { ...videoData }, url, ref };
      })
    );

    const screenshotsPromiseParsed = await Promise.allSettled(
      parseCollectionToArray(workspace.screenshots).map(
        async screenshotData => {
          try {
            const imgRef = await this.getImageOrItsThumbnailRef(
              workspace.id,
              screenshotData.refName
            );
            const url = (await imgRef.getSignedUrl(this.config))[0];
            const ref = (await imgRef.getMetadata())[0];

            return { dbData: { ...screenshotData }, url, ref };
          } catch (e) {
            console.log(e);
            return null;
          }
        }
      )
    );

    const videos = videosPromiseParsed
      .map(x => (x.status === 'fulfilled' ? x.value : null))
      .filter(x => x !== null);

    const screenshots: IWorkspaceImage[] = screenshotsPromiseParsed
      .map(x => (x.status === 'fulfilled' ? x.value : null))
      .filter(x => x !== null);

    // console.log(screenshots);

    return { ...workspace, screenshots, videos };
  }

  async getWorkspaceById(workspaceId: string): Promise<{
    workspaceVal: IWorkspace;
    workspaceRef: Reference;
    db: Database;
  }> {
    const db = admin.database();
    const workspaceRef = db.ref(`workspaces/${workspaceId}`);
    const workspaceSnap = await workspaceRef.get();
    const workspaceVal: IWorkspace = workspaceSnap.val();

    if (!workspaceSnap.exists()) {
      throw { message: 'Workspace does not exist!' };
    }

    return { workspaceVal, workspaceRef, db };
  }

  async getShortUserData(id: string) {
    const db = admin.database();
    const userRef = db.ref(`users/${id}`);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists()) return null;

    const userVal: IUser = userSnapshot.val();
    const userData: IUserShort = {
      id,
      email: userVal.email,
      displayName: userVal?.displayName || 'User',
      photoURL: userVal?.photoURL || '',
    };

    return userData;
  }
}
