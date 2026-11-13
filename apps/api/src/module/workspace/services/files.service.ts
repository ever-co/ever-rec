import { join } from 'path';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { canWriteVideoByName } from '../guards/utils';
import { is_plain_file_name } from '../validators/video-filename.validator';
import { StreamServiceService } from 'src/module/video-services/streamService.service';
import {
  IDataResponse,
  ItemType,
  PermissionsItemType,
} from '../../../interfaces/_types';
import * as admin from 'firebase-admin';
import { AddToDbProps } from '../Interfaces/AddToDbProps';
import { TMP_PATH_FIXED } from '../../../enums/tmpPathsEnums';
import { fixVideoWithFFMPEG } from '../../../services/utils/fixVideoWithFFMPEG';
import { uploadVideoToBucket } from '../../../services/utils/uploadVideoToBucket';
import { WorkspaceUtilitiesService } from './utilities.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IDbWorkspaceImageData,
  IDbWorkspaceVideoData,
  IWorkspaceImage,
  IWorkspaceVideo,
} from '../Interfaces/Files';
import {
  promiseAllSettled,
  parseCollectionToArray,
  parseCollectionToIdValueObj,
} from '../../../services/utils/helpers';
import { IWorkspaceFolder } from '../Interfaces/Folders';
import {
  dbEndpoints,
  SharedService,
} from '../../../services/shared/shared.service';
import { DbVideoData, IStreamingDbData } from 'src/interfaces/IEditorVideo';
import { PlaybackStatusEnum } from 'src/enums/StreamingServicesEnums';
import { IChapter } from 'src/interfaces/IChapter';
import { nanoid } from 'nanoid';
import { sendError, sendResponse } from 'src/services/utils/sendResponse';
import { WorkspaceShareService } from './share.service';
import sharp from 'sharp';
import { IUser } from 'src/interfaces/IUser';
import { EditorGateway } from 'src/module/editor-websocket-module/editor.gateway';
import {
  EVER_COUNTER_EVENTS,
  storedBytes,
} from '../../../common/events/ever-counters.events';

const typeParser = {
  itemLocation: {
    video: 'videos',
    image: 'screenshots',
  },
};

@Injectable()
export class WorkspaceFilesService {
  private readonly config;

  constructor(
    private readonly utilitiesService: WorkspaceUtilitiesService,
    private readonly streamService: StreamServiceService,
    private readonly workspaceShareService: WorkspaceShareService,
    private readonly sharedService: SharedService,
    private eventEmitter: EventEmitter2,
    private editorGateway: EditorGateway,
  ) {
    this.config = {
      action: 'read',
      expires: '03-01-2500',
    };
  }

  async saveOriginalWSImageInBucket(
    workspaceId: string,
    fullFileName: string,
  ): Promise<any> {
    const bucket = admin.storage().bucket();

    const file = bucket
      .file(`workspaces/${workspaceId}/screenshots/${fullFileName}`)
      .copy(`workspaces/${workspaceId}/screenshots/originals/${fullFileName}`);

    return file;
  }

  async saveOriginalWSImage(workspaceId: string, fullFileName: string) {
    const bucket = admin.storage().bucket();
    if (workspaceId && fullFileName) {
      try {
        const res = await this.saveOriginalWSImageInBucket(
          workspaceId,
          fullFileName,
        );

        if (res) {
          const copiedfile = bucket.file(
            `workspaces/${workspaceId}/screenshots/originals/${fullFileName}`,
          );

          const downloadUrl = (await copiedfile.getSignedUrl(this.config))[0];
          return downloadUrl;
        }
      } catch (error: any) {
        console.log(error);
      }
    }
  }

  async addImageFromFile(
    uid: string,
    workspaceId: string,
    file: Express.Multer.File,
    title: string,
    fullFileName: string,
    folderId: string | false,
  ): Promise<IDataResponse<IWorkspaceImage | null>> {
    try {
      const { file: storedImage, thumbnail: uploadedImage } =
        await this.utilitiesService.uploadImageInBucket(
          file,
          workspaceId,
          fullFileName,
        );

      const savedOriginal = await this.saveOriginalWSImage(
        workspaceId,
        fullFileName,
      );

      const metadata = (await uploadedImage.getMetadata())[0];
      const downloadUrl = (await uploadedImage.getSignedUrl(this.config))[0];

      if (metadata) {
        const id = nanoid(24);
        const dbData = await this.utilitiesService.addImageToDb({
          id,
          uid,
          title,
          refName: fullFileName,
          folderId,
          workspaceId,
          metadata,
          originalImage: savedOriginal,
        });
        const image: IWorkspaceImage = {
          dbData: dbData,
          ref: metadata,
          url: downloadUrl,
        };

        // Update folder item count recursively
        const { workspaceVal, workspaceRef } =
          await this.utilitiesService.getWorkspaceById(workspaceId);

        const updatedFolders =
          this.utilitiesService.changeFolderItemCountRecursive(
            parseCollectionToArray(workspaceVal.folders),
            folderId,
          );

        await workspaceRef.update({ folders: updatedFolders });

        this.eventEmitter.emit(
          'analytics.track',
          'Screenshot Uploaded in workspace',
          {
            userId: uid,
            workspaceId: workspaceId,
            properties: { title, url: downloadUrl, uid, workspaceId },
          },
        );

        // The stored image, not its thumbnail: the bytes a delete subtracts.
        this.eventEmitter.emit(EVER_COUNTER_EVENTS.mediaCreated, {
          kind: 'screenshot',
          bytes: await storedBytes(
            this.eventEmitter,
            storedImage,
            EVER_COUNTER_EVENTS.mediaCreated,
          ),
        });
        return sendResponse<IWorkspaceImage>(image);
      } else {
        return sendError('No screenshot metadata.');
      }
    } catch (e) {
      console.log(e);
      return sendError('Error while trying to store file to the database');
    }
  }

  async moveItemFromPersonalToWorkspace(
    uid: string,
    workspaceId: string,
    itemId: string,
    itemType: ItemType,
    folderId: string | false,
  ): Promise<IDataResponse<IWorkspaceImage | IWorkspaceVideo>> {
    // TODO validate folderId exists
    try {
      const newId = nanoid(24);
      const db = admin.database();
      const bucket = admin.storage().bucket();
      const itemLocation = typeParser.itemLocation[itemType];
      const refPath = `users/${uid}/${itemLocation}/${itemId}`;
      const itemRef = db.ref(refPath);
      const itemSnap = await itemRef.get();
      const itemVal: DbVideoData = itemSnap.val();

      if (!itemVal) {
        throw new Error('There is no data for item with path: ' + refPath);
      }

      if (itemType === 'video') {
        // The copy below stores the file under the personal record's name, replacing any video of
        // the workspace that has the same name. Allow it only for a plain file name (a personal
        // video can have any extension, so only path tricks are refused) that no video the user
        // may not write already uses.
        const refName: unknown = itemVal.refName;
        if (!is_plain_file_name(refName)) {
          throw new BadRequestException('The video has no valid file name');
        }
        const { workspaceVal } =
          await this.utilitiesService.getWorkspaceById(workspaceId);
        if (!canWriteVideoByName(workspaceVal, { id: uid } as IUser, refName)) {
          throw new ForbiddenException(
            'You are not allowed to add this video to the workspace',
          );
        }
      }

      // Copy original file
      const [file] = await bucket
        .file(`users/${uid}/${itemLocation}/${itemVal.refName}`)
        .copy(`workspaces/${workspaceId}/${itemLocation}/${itemVal.refName}`);
      itemLocation === 'screenshots' &&
        (await bucket
          .file(`users/${uid}/${itemLocation}/thumbnails/${itemVal.refName}`)
          .copy(
            `workspaces/${workspaceId}/${itemLocation}/thumbnails/${itemVal.refName}`,
          ));
      const metadata = (await file.getMetadata())[0];
      const downloadUrl = (await file.getSignedUrl(this.config))[0];

      let url = downloadUrl;

      // Only an image has an original. A video's name must not reach the image originals: that
      // would overwrite the original of an image that has the same file name.
      let originalImageURL: string | undefined;
      if (itemType === 'image') {
        await bucket
          .file(`users/${uid}/screenshots/originals/${itemVal.refName}`)
          .copy(
            `workspaces/${workspaceId}/screenshots/originals/${itemVal.refName}`,
          );

        const originalFile = await bucket.file(
          `workspaces/${workspaceId}/screenshots/originals/${itemVal.refName}`,
        );

        originalImageURL = (await originalFile.getSignedUrl(this.config))[0];
      }

      // Copy asset in streaming service and create new streamData
      const streamData = itemVal?.streamData;
      let copiedStreamData: IStreamingDbData | null = null;
      if (streamData) {
        const { assetId, serviceType } = itemVal.streamData;

        copiedStreamData = await this.streamService.copyAsset(
          assetId,
          serviceType,
        );

        if (copiedStreamData) {
          copiedStreamData.downloadUrl = downloadUrl;
          copiedStreamData.downloadStatus = PlaybackStatusEnum.READY;

          url = copiedStreamData.playbackUrl;
        }
      }

      // Copy chapters
      const chaptersEnabled = itemVal?.chaptersEnabled;
      const chapters = await this.copyChapters(
        uid,
        workspaceId,
        itemId,
        newId,
        parseCollectionToArray({ ...itemVal?.chapters }),
      );

      const stage = itemVal?.stage;

      const mainDbData: AddToDbProps = {
        id: newId,
        uid,
        title: itemVal.title,
        refName: itemVal.refName,
        folderId,
        workspaceId,
        metadata,
        streamData: copiedStreamData,
        chapters,
        chaptersEnabled,
        stage: stage,
        originalImage: originalImageURL,
      };

      const dbData =
        itemType === 'image'
          ? await this.utilitiesService.addImageToDb(mainDbData)
          : await this.utilitiesService.addVideoToDb({
              ...mainDbData,
              duration: itemVal.duration,
            });

      const item: IWorkspaceImage | IWorkspaceVideo = {
        ref: metadata,
        url,
        dbData: dbData,
      };

      // The workspace now holds its own copy of the file.
      this.eventEmitter.emit(EVER_COUNTER_EVENTS.mediaCreated, {
        kind: itemType === 'image' ? 'screenshot' : 'video',
        bytes: Number(metadata?.size) || 0,
      });

      this.eventEmitter.emit(
        'analytics.track',
        `${
          itemType === 'image' ? 'Screenshot' : 'Video'
        } Added in workspace from User Personal Storage`,
        {
          userId: uid,
          workspaceId: workspaceId,
          properties: {
            title: itemVal.title,
            url: downloadUrl,
            uid,
            workspaceId,
          },
        },
      );

      return sendResponse<IWorkspaceImage | IWorkspaceVideo>(item);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.log(error);
      return sendError('There was a problem moving an item to a workspace.');
    }
  }

  private async copyChapters(
    uid: string,
    workspaceId: string,
    itemId: string,
    newId: string,
    chapters: IChapter[],
  ): Promise<any> {
    if (!chapters.length) {
      return null;
    }
    const bucket = admin.storage().bucket();

    const thumbnailFileRefs = [];
    const chaptersMap = {};

    const copyRefPromises = chapters.map(async (chapter) => {
      const refName = chapter.refName;
      const filePath = `users/${uid}/videosThumbnails/${itemId}/${refName}`;
      const copyPath = `workspaces/${workspaceId}/videosThumbnails/${newId}/${refName}`;

      const newFileRef = bucket.file(copyPath);
      thumbnailFileRefs.push(newFileRef);

      const copyPromise = bucket.file(filePath).copy(copyPath);
      return copyPromise;
    });

    await promiseAllSettled(copyRefPromises);

    // Get Signed URLs from copied files
    const signedURLPromises = thumbnailFileRefs.map((ref) =>
      ref.getSignedUrl(this.config),
    );
    const signedURLs = await promiseAllSettled(signedURLPromises).then(
      (values) => values.flat(),
    );

    // Update chapters thumbnailURL and create a new Map for the database
    chapters.forEach((chapter, index) => {
      const thumbnailURL = signedURLs[index];
      const newChapter = { ...chapter, thumbnailURL };

      chaptersMap[chapter.id] = newChapter;
    });

    return chaptersMap;
  }

  async getImage(
    workspaceId: string,
    imageId: string,
  ): Promise<IDataResponse<IWorkspaceImage | null>> {
    try {
      const db = admin.database();
      const imageRef = db.ref(
        `workspaces/${workspaceId}/screenshots/${imageId}`,
      );
      const imageSnap = await imageRef.get();
      const imageVal = imageSnap.val();

      if (imageVal) {
        const bucket = admin.storage().bucket();
        const file = bucket.file(
          `workspaces/${workspaceId}/screenshots/${imageVal.refName}`,
        );
        const url = (await file.getSignedUrl(this.config))[0];

        const userData = await this.utilitiesService.getShortUserData(
          imageVal.uid,
        );

        const image = {
          dbData: { ...imageVal, id: imageId, user: userData },
          url,
        };

        return sendResponse<IWorkspaceImage>(image);
      } else {
        return sendError('Workspace does not exist.');
      }
    } catch (e) {
      console.log(e);
      return sendError(
        'Error while trying to get workspace image. Please try again later.',
      );
    }
  }

  async getVideo(
    workspaceId: string,
    videoId: string,
  ): Promise<IDataResponse<IWorkspaceVideo | null>> {
    try {
      const db = admin.database();
      const bucket = admin.storage().bucket();
      const refPath = `workspaces/${workspaceId}/videos/${videoId}`;
      const videoRef = db.ref(refPath);
      const videoSnap = await videoRef.get();
      const videoVal: IDbWorkspaceVideoData = videoSnap.val();

      if (!videoVal) {
        throw new Error('Could not find workspace video with path: ' + refPath);
      }

      let url = '';
      const streamData = videoVal?.streamData;
      if (streamData) {
        url = streamData.playbackUrl;
      } else {
        const file = bucket.file(
          `workspaces/${workspaceId}/videos/${videoVal.refName}`,
        );
        url = (await file.getSignedUrl(this.config))[0];
      }

      let sharedLink: string | undefined | null = null;
      sharedLink = await this.findSharedLinkWorkspace(workspaceId, videoId);

      const userData = await this.utilitiesService.getShortUserData(
        videoVal.uid,
      );

      const video = {
        dbData: { ...videoVal, id: videoId, user: userData },
        sharedLink,
        url,
      };

      return sendResponse<IWorkspaceVideo>(video);
    } catch (e) {
      console.log(e);
      return sendError(
        'There was a problem while trying to get the workspace video.',
      );
    }
  }

  async findSharedLinkWorkspace(
    workspaceId: string,
    itemId: string,
  ): Promise<string | null> {
    const db = admin.database();
    const query = `${workspaceId}|${itemId}`;

    const sharedRef = db.ref(`sharedWorkspaceItems`);
    const sharedSnapshot = await sharedRef
      .orderByChild('queryField')
      .equalTo(query)
      .get();

    const sharedVal = sharedSnapshot.val();

    if (sharedVal) {
      const keys = Object.keys(sharedVal);
      return keys.length ? keys[0] : null;
    }

    return null;
  }

  async updateImage(
    workspaceId: string,
    blob: Express.Multer.File,
    refName: string,
    location: string,
  ): Promise<string> {
    const bucket = admin.storage().bucket();
    const file = bucket.file(
      `workspaces/${workspaceId}/screenshots/${refName ? refName : location}`,
    );
    const thumnbnail = bucket.file(
      `workspaces/${workspaceId}/screenshots/thumbnails/${
        refName ? refName : location
      }`,
    );

    const buffer = Buffer.from(blob.buffer);

    const thumbnailBuffer = await sharp(buffer)
      .resize({
        width: 480,
        height: 270,
        position: 'top',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        withoutEnlargement: true,
      })
      .toBuffer();

    await Promise.all([file.save(buffer), thumnbnail.save(thumbnailBuffer)]);

    return (
      await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 1000 * 15778476000,
      })
    )[0];
  }

  async updateItemData(
    uid: string,
    workspaceId: string,
    itemType: ItemType,
    id: string,
    parentId?: string | false,
    trash?: boolean,
    likes?: { uid: string; timestamp: number }[],
    title?: string,
    stage?: any,
    originalImage?: string,
    markers?: string,
  ): Promise<IDataResponse<IWorkspaceVideo | null>> {
    const db = admin.database();
    const items = itemType === 'image' ? 'screenshots' : 'videos';
    const dbItemRef = db.ref(`workspaces/${workspaceId}/${items}/${id}`);

    // TODO validate likes didn't add any anallowed

    await dbItemRef.update({
      ...(title !== undefined ? { title } : {}),
      ...(parentId !== undefined ? { parentId } : {}),
      ...(trash !== undefined ? { trash } : {}),
      ...(likes !== undefined ? { likes } : {}),
      ...(stage !== undefined ? { stage } : {}),
      ...(originalImage !== undefined ? { originalImage } : {}),
      ...(markers !== undefined ? { markers } : {}),
    });

    if (markers !== undefined) {
      this.editorGateway.emitMarkerUpdate(uid, id, markers);
    }
    if (itemType === 'image') {
      return this.getImage(workspaceId, id);
    }

    return this.getVideo(workspaceId, id);
  }

  async addVideoFromFile(
    uid: string,
    workspaceId: string,
    blob: Express.Multer.File,
    title: string,
    fullFilename: string,
    folderId: string | false,
  ): Promise<IDataResponse<IWorkspaceVideo | null>> {
    try {
      let videoDuration = undefined;

      const inputPath = blob.path;
      const fixedVideoPath = join(TMP_PATH_FIXED, fullFilename);
      const { duration: ffmpegDuration } = await fixVideoWithFFMPEG(
        inputPath,
        fixedVideoPath,
      );

      // Set new duration calculated with FFMPEG
      if (ffmpegDuration) {
        videoDuration = ffmpegDuration;
      }

      const res = await uploadVideoToBucket({
        workspaceId,
        fullFilepath: fixedVideoPath,
        fullFilename,
        itemTypePath: 'videos',
      });
      const metadata = (await res.getMetadata())[0];
      const downloadUrl = (await res.getSignedUrl(this.config))[0];

      if (metadata) {
        const id = nanoid(24);
        const dbData = await this.utilitiesService.addVideoToDb({
          id,
          uid,
          title,
          refName: fullFilename,
          folderId,
          workspaceId,
          metadata,
          duration: videoDuration,
        });
        const video = {
          dbData,
          ref: metadata,
          url: downloadUrl,
        };

        // Update folder item count recursively
        const { workspaceVal, workspaceRef } =
          await this.utilitiesService.getWorkspaceById(workspaceId);

        const updatedFolders =
          this.utilitiesService.changeFolderItemCountRecursive(
            parseCollectionToArray(workspaceVal.folders),
            folderId,
          );

        await workspaceRef.update({ folders: updatedFolders });

        this.eventEmitter.emit(
          'analytics.track',
          'Video Uploaded to workspace',
          {
            userId: uid,
            workspaceId: workspaceId,
            properties: { url: downloadUrl, title, ...metadata, workspaceId },
          },
        );

        // Should decide what to send to the Extension after and IF storageReference is resolved
        this.eventEmitter.emit(EVER_COUNTER_EVENTS.mediaCreated, {
          kind: 'video',
          bytes: Number(metadata.size) || 0,
        });
        return sendResponse<IWorkspaceVideo>(video);
      } else {
        return sendError('No video metadata');
      }
    } catch (e) {
      console.log(e);
      return sendError('Error while trying to upload video to workspace.', e);
    }
  }

  /**
   * Deletes the image `imageId` and the stored files of that image. The storage names come from
   * the image's own record, never from the request: the route's permission check is made on
   * `imageId`, so a client-supplied file name could otherwise delete another image's file.
   */
  async deleteImage(
    workspaceId: string,
    imageId: string,
    folderId: string | false,
  ): Promise<IDataResponse<string | null>> {
    try {
      const db = admin.database();
      const bucket = admin.storage().bucket();
      const { workspaceVal, workspaceRef } =
        await this.utilitiesService.getWorkspaceById(workspaceId);

      const imageReference = db.ref(
        `workspaces/${workspaceId}/screenshots/${imageId}`,
      );
      const refName: unknown = (await imageReference.get()).val()?.refName;
      if (typeof refName !== 'string' || refName === '') {
        // No such image in this workspace: there is nothing of it to delete.
        return sendError('Error while trying to delete an image', 'Not found');
      }

      const imageStorageRef = bucket.file(
        `workspaces/${workspaceId}/screenshots/${refName}`,
      );
      const imageThumbnailStorageRef = bucket.file(
        `workspaces/${workspaceId}/screenshots/thumbnails/${refName}`,
      );

      const imageOriginalStorageRef = bucket.file(
        `workspaces/${workspaceId}/screenshots/originals/${refName}`,
      );

      const everStatsBytes = await storedBytes(
        this.eventEmitter,
        imageStorageRef,
      );
      this.workspaceShareService.deleteLinkById(workspaceId, imageId);

      imageStorageRef.delete().catch(() => {
        console.log('Error deleting image from reference: ' + refName);
      });
      imageThumbnailStorageRef.delete().catch(() => {
        console.log(
          'Error deleting image thumbnail from reference: ' + refName,
        );
      });

      imageOriginalStorageRef.delete().catch(() => {
        console.log('Error deleting video from reference: ' + refName);
      });

      await imageReference.remove();
      this.eventEmitter.emit(EVER_COUNTER_EVENTS.mediaDeleted, {
        kind: 'screenshot',
        bytes: everStatsBytes,
      });

      const updatedFolders =
        this.utilitiesService.changeFolderItemCountRecursive(
          parseCollectionToArray(workspaceVal.folders),
          folderId,
          -1,
        );

      await workspaceRef.update({ folders: updatedFolders });

      return sendResponse('Successfully deleted the image');
    } catch (e) {
      return sendError('Error while trying to delete an image', e.message);
    }
  }

  // TODO: Delete poster(thumbnail) if video is sent by email and poster is created.
  /**
   * Deletes the video `videoId` and the stored file of that video. The storage name comes from the
   * video's own record, never from the request: the route's permission check is made on `videoId`,
   * so a client-supplied file name could otherwise delete another video's file.
   */
  async deleteVideo(
    workspaceId: string,
    videoId: string,
  ): Promise<IDataResponse<string | null>> {
    try {
      const db = admin.database();
      const bucket = admin.storage().bucket();

      const videoRef = db.ref(`workspaces/${workspaceId}/videos/${videoId}`);
      const videoData = (await videoRef.get()).val();
      if (!videoData) {
        // No such video in this workspace: there is nothing of it to delete.
        return sendError('Error while trying to delete a video', 'Not found');
      }

      this.workspaceShareService.deleteLinkById(workspaceId, videoId);

      const refName: unknown = videoData.refName;
      let everStatsBytes = 0;
      if (typeof refName === 'string' && refName !== '') {
        const fileRef = bucket.file(
          `workspaces/${workspaceId}/videos/${refName}`,
        );
        everStatsBytes = await storedBytes(this.eventEmitter, fileRef);
        fileRef.delete().catch(() => {
          console.log('Error deleting video from reference: ' + refName);
        });
      }

      bucket
        .deleteFiles({
          prefix: `workspaces/${workspaceId}/videosThumbnails/${videoId}/`,
        })
        .catch((error) => {
          console.log('Error deleting video chapters:', error);
        });

      const assetId = videoData?.streamData?.assetId;
      const serviceType = videoData?.streamData?.serviceType;
      this.streamService.deleteAsset(assetId, serviceType).catch(() => {
        console.log(
          `Error deleting asset from service ${serviceType}: ${assetId}`,
        );
      });

      await videoRef.remove();
      this.eventEmitter.emit(EVER_COUNTER_EVENTS.mediaDeleted, {
        kind: 'video',
        bytes: everStatsBytes,
      });

      this.eventEmitter.emit(
        'analytics.track',
        'Video deleted from workspace',
        {
          workspaceId,
          properties: { id: videoId },
        },
      );

      return sendResponse('Video deleted successfully');
    } catch (error: any) {
      console.log(error);
      return sendError('Error while trying to delete an image', error.message);
    }
  }
}
