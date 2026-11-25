import { extname, join } from 'path';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  canAccessFolderById,
  canAccessItemData,
  canWriteVideoByName,
} from '../guards/utils';
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
import { updateExistingItem } from './update-existing-item';
import { changeWorkspaceFolders } from './change-workspace-collection';
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
  IWorkspace,
  IWorkspaceUser,
  PermissionAccessEnum,
} from '../Interfaces/Workspace';
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

/** What the cleanup of a deleted item needs of one of its stored files (a `File` of the bucket). */
interface ItemFile {
  readonly name: string;
  getMetadata(): Promise<unknown>;
  delete(options: { ifGenerationMatch: string | number }): Promise<unknown>;
}

/** The generation a stored file has, or null when it is not stored. */
type Generation = string | number | null;

/** What a delete reads of one of the item's stored files before its record is removed. */
interface StoredVersion {
  readonly generation: Generation;
  /** The size of the file, for the counter of deleted bytes (0 when it is not known). */
  readonly bytes: number;
}

const NOT_STORED: StoredVersion = { generation: null, bytes: 0 };

/**
 * The extension of a personal file name (`.png` of `shot.png`), kept on the name of its workspace
 * copy. Empty for a name without one, or with one that is not plain letters and digits.
 */
const copyExtension = (fileName: unknown): string => {
  const extension = typeof fileName === 'string' ? extname(fileName) : '';
  return /^\.[A-Za-z0-9]{1,16}$/.test(extension) ? extension : '';
};

const errorCode = (error: unknown): number =>
  Number((error as { code?: unknown } | null)?.code);

@Injectable()
export class WorkspaceFilesService {
  private readonly config;
  private readonly logger = new Logger(WorkspaceFilesService.name);

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

        // Update folder item count recursively, in one transaction on the folder list
        const counted = await changeWorkspaceFolders(
          workspaceId,
          (folders) => ({
            items: this.utilitiesService.changeFolderItemCountRecursive(
              folders,
              folderId,
            ),
          }),
        );

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

        if (counted.ok === false) {
          return sendError(
            'The screenshot was stored, but the folder item count could not be updated.',
          );
        }
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
    // Images only: the file name the permission check was made for (null: none was found). The
    // copy is refused if the personal image has another name by now. Undefined: no such check.
    checkedRefName?: string | null,
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

      if (
        checkedRefName !== undefined &&
        (itemVal.refName ?? null) !== checkedRefName
      ) {
        throw new Error('The item changed name while it was being moved.');
      }

      if (itemType === 'video') {
        // The personal record's file name is the path the copy is read from: only a plain file
        // name is allowed (a personal video can have any extension, so only path tricks are
        // refused). A name that a workspace video the user may not write uses is still refused, as
        // before, although the copy no longer takes that name (see `copyName`).
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

      // The copy is stored under a name of its own, made here: the new record's id and the
      // extension of the personal file. Under the personal file name, a second copy of the same
      // item would get a record that names the first copy's files, and deleting either record
      // would delete them.
      const copyName = `${newId}${copyExtension(itemVal.refName)}`;

      // Copy original file
      const [file] = await bucket
        .file(`users/${uid}/${itemLocation}/${itemVal.refName}`)
        .copy(`workspaces/${workspaceId}/${itemLocation}/${copyName}`);
      itemLocation === 'screenshots' &&
        (await bucket
          .file(`users/${uid}/${itemLocation}/thumbnails/${itemVal.refName}`)
          .copy(
            `workspaces/${workspaceId}/${itemLocation}/thumbnails/${copyName}`,
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
          .copy(`workspaces/${workspaceId}/screenshots/originals/${copyName}`);

        const originalFile = await bucket.file(
          `workspaces/${workspaceId}/screenshots/originals/${copyName}`,
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
        refName: copyName,
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

  /**
   * The ids of the workspace admin and members who may read the item at `itemRef` and the folder
   * it is in now: the users who receive its marker updates. The rules are the READ checks of the
   * HTTP routes (`canAccessItemData` and `canAccessFolderById`), so a member left out of the
   * item's or the folder's access list gets nothing. Fails closed: nobody when the item or the
   * workspace cannot be read. The id goes into a database path, so the caller must have checked it
   * (the routes use `ValidateId`).
   */
  private async markerRecipientIds(
    workspaceId: string,
    itemRef: admin.database.Reference,
  ): Promise<string[]> {
    try {
      // The stored item (with the parentId of this save) and only the parts of the workspace the
      // rules read, not the whole workspace.
      const db = admin.database();
      const [itemSnap, adminSnap, membersSnap, teamsSnap, foldersSnap] =
        await Promise.all([
          itemRef.get(),
          db.ref(`workspaces/${workspaceId}/admin`).get(),
          db.ref(`workspaces/${workspaceId}/members`).get(),
          db.ref(`workspaces/${workspaceId}/teams`).get(),
          db.ref(`workspaces/${workspaceId}/folders`).get(),
        ]);
      const item: IDbWorkspaceImageData | IDbWorkspaceVideoData | null =
        itemSnap.val();
      if (!item) {
        return [];
      }
      const members = parseCollectionToArray<IWorkspaceUser>(
        membersSnap.val(),
      ).filter((member) => !!member);
      const workspace = {
        admin: adminSnap.val(),
        members,
        teams: teamsSnap.val(),
        folders: foldersSnap.val(),
      } as IWorkspace;
      const read = PermissionAccessEnum.READ;

      return [
        ...new Set([workspace.admin, ...members.map((member) => member.id)]),
      ]
        .filter((id): id is string => typeof id === 'string' && id !== '')
        .filter((id) => {
          const user: IUser = { id };
          return (
            canAccessItemData(item, workspace, user, read) &&
            canAccessFolderById(item.parentId, workspace, user, read)
          );
        });
    } catch (e) {
      console.log(e);
      return [];
    }
  }

  async updateItemData(
    uid: string,
    workspaceId: string,
    itemType: ItemType,
    id: string,
    parentId?: string | false,
    trash?: boolean,
    title?: string,
    stage?: any,
    originalImage?: string,
    markers?: string,
  ): Promise<IDataResponse<IWorkspaceVideo | null>> {
    const db = admin.database();
    const items = itemType === 'image' ? 'screenshots' : 'videos';
    const dbItemRef = db.ref(`workspaces/${workspaceId}/${items}/${id}`);

    // Never create a record from here, even if the item is deleted after the guard ran.
    const updated = await updateExistingItem(dbItemRef, {
      ...(title !== undefined ? { title } : {}),
      ...(parentId !== undefined ? { parentId } : {}),
      ...(trash !== undefined ? { trash } : {}),
      ...(stage !== undefined ? { stage } : {}),
      ...(originalImage !== undefined ? { originalImage } : {}),
      ...(markers !== undefined ? { markers } : {}),
    });

    if (!updated) {
      return sendError('Item not found', 'Not found');
    }

    if (markers !== undefined) {
      this.editorGateway.emitMarkerUpdate(
        await this.markerRecipientIds(workspaceId, dbItemRef),
        uid,
        id,
        markers,
      );
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

        // Update folder item count recursively, in one transaction on the folder list
        const counted = await changeWorkspaceFolders(
          workspaceId,
          (folders) => ({
            items: this.utilitiesService.changeFolderItemCountRecursive(
              folders,
              folderId,
            ),
          }),
        );

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

        if (counted.ok === false) {
          return sendError(
            'The video was stored, but the folder item count could not be updated.',
          );
        }
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
   * Removes the item `itemId` of `workspaces/<workspaceId>/<collection>` in one transaction on the
   * item, then lowers the item count of the folder it was stored in and of every folder above that
   * one. The folder is the one in the item's record, never one a request names: the client's view
   * may be stale (the item moved meanwhile), and a query can name any folder. Only the delete whose
   * transaction removed the item counts it, so of two deletes of one item at the same time the
   * other finds it gone and changes no count.
   *
   * `removed`: this delete removed the item. `counted`: false when the folder counts could not be
   * changed. Throws when the removal does not commit.
   */
  private async removeWorkspaceItem(
    workspaceId: string,
    collection: 'screenshots' | 'videos',
    itemId: string,
  ): Promise<{ removed: boolean; counted: boolean }> {
    // What the last run saw: the run whose write is stored.
    const seen: { item: { parentId?: unknown } | null } = { item: null };
    const result = await admin
      .database()
      .ref(`workspaces/${workspaceId}/${collection}/${itemId}`)
      .transaction((current: unknown) => {
        seen.item =
          current && typeof current === 'object'
            ? (current as { parentId?: unknown })
            : null;
        // Always `null`, never an abort: the first run may get the local guess (`null` for an item
        // that is stored), and its write is checked against the stored item and run again with it
        // (see `changeWorkspaceCollection`).
        return null;
      });
    if (!result.committed) {
      throw new Error('The item could not be removed.');
    }
    if (!seen.item) {
      // Removed meanwhile, by a delete that counted it.
      return { removed: false, counted: true };
    }

    const parentId = seen.item.parentId;
    if (typeof parentId !== 'string' || parentId === '') {
      // At the top level: no folder counts it.
      return { removed: true, counted: true };
    }
    const counted = await changeWorkspaceFolders(workspaceId, (folders) => ({
      items: this.utilitiesService.changeFolderItemCountRecursive(
        folders,
        parentId,
        -1,
      ),
    }));
    return { removed: true, counted: counted.ok };
  }

  /**
   * The generation `file` is stored with, and its size, read in one request before the record that
   * names it is removed (see `deleteUnlessReplaced`). No generation when it is not stored: the
   * cleanup skips it. Also none, and logged, when its metadata cannot be read: without its
   * generation a file stored under the same name later could not be told from it, so it is kept.
   * A file that is kept frees no bytes, so its size is 0 then.
   */
  private async storedVersion(file: ItemFile): Promise<StoredVersion> {
    try {
      const [metadata] = (await file.getMetadata()) as Array<{
        generation?: unknown;
        size?: unknown;
      }>;
      const generation = metadata?.generation;
      if (
        (typeof generation === 'string' && generation !== '') ||
        typeof generation === 'number'
      ) {
        const size = Number(metadata?.size);
        return {
          generation,
          bytes: Number.isFinite(size) && size > 0 ? Math.floor(size) : 0,
        };
      }
      console.log('No generation stored for ' + file.name + '; it is kept.');
    } catch (error) {
      if (errorCode(error) === 404) {
        this.logger.debug(`${file.name} is not stored; nothing to delete.`);
      } else {
        console.log('Error reading ' + file.name + '; it is kept.', error);
      }
    }
    return NOT_STORED;
  }

  /**
   * True when a record of `workspaces/<workspaceId>/<collection>` holds the file name `refName`.
   * A delete asks this after it removed its own record: another record that holds the name names
   * the same stored files (records stored before each copy got a name of its own can share one),
   * so they are kept for it. Asked after the removal, so of two records that share a name and are
   * deleted at the same time, at least one delete finds the other record gone and deletes the
   * files. Also true, and logged, when the records cannot be read: the files are kept.
   */
  private async isFileNameHeld(
    workspaceId: string,
    collection: 'screenshots' | 'videos',
    refName: string,
  ): Promise<boolean> {
    try {
      const records = (
        await admin
          .database()
          .ref(`workspaces/${workspaceId}/${collection}`)
          .get()
      ).val();
      return parseCollectionToArray<{ refName?: unknown }>(records).some(
        (record) => record?.refName === refName,
      );
    } catch (error) {
      console.log(
        `Error reading the ${collection} of the workspace; the files of ${refName} are kept.`,
        error,
      );
      return true;
    }
  }

  /**
   * Deletes `file`, a file of an item whose record this request removed, only while it still has
   * `generation`, the one read before the removal. Once the record is gone its name is free: the
   * upload routes take the name from the client (`fullFileName`) and refuse (409) only a name a
   * record still holds, so an upload can store new files under it before this runs. That upload
   * changes the generation, the precondition fails (412) and its files stay. A file gone already
   * (404) is left as it is. Any other error rejects. Resolves at once for a file that was not
   * stored.
   */
  private async deleteUnlessReplaced(
    file: ItemFile,
    generation: Generation,
  ): Promise<void> {
    if (generation === null) {
      return;
    }
    try {
      await file.delete({ ifGenerationMatch: generation });
    } catch (error) {
      const code = errorCode(error);
      if (code === 412) {
        this.logger.debug(
          `${file.name} was stored again after its record was removed; it is kept.`,
        );
        return;
      }
      if (code === 404) {
        this.logger.debug(`${file.name} is gone already.`);
        return;
      }
      throw error;
    }
  }

  /**
   * Deletes the image `imageId` and the stored files of that image. The storage names come from
   * the image's own record, never from the request: the route's permission check is made on
   * `imageId`, so a client-supplied file name could otherwise delete another image's file. The
   * files stay while another image of the workspace still holds the name (see `isFileNameHeld`).
   * The folder counts that lose the image are those of the folder in its record (see
   * `removeWorkspaceItem`).
   */
  async deleteImage(
    workspaceId: string,
    imageId: string,
  ): Promise<IDataResponse<string | null>> {
    try {
      const db = admin.database();
      const bucket = admin.storage().bucket();

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
      // Read while the record still holds the name, so the cleanup deletes these files and not
      // the files of an upload under the same name once the record is gone (see
      // `deleteUnlessReplaced`), with the size the delete reports.
      const [image, thumbnail, original] = await Promise.all(
        [
          imageStorageRef,
          imageThumbnailStorageRef,
          imageOriginalStorageRef,
        ].map((file) => this.storedVersion(file)),
      );

      // The record goes first. Only the delete that removed it deletes the files and reports their
      // size: a delete of the same image at the same time finds it gone, and a removal that does
      // not commit leaves the image whole.
      const { removed, counted } = await this.removeWorkspaceItem(
        workspaceId,
        'screenshots',
        imageId,
      );
      if (removed) {
        this.workspaceShareService.deleteLinkById(workspaceId, imageId);

        // Files another image still names are its files too: they stay, and no bytes are freed.
        const kept = await this.isFileNameHeld(
          workspaceId,
          'screenshots',
          refName,
        );
        if (!kept) {
          this.deleteUnlessReplaced(imageStorageRef, image.generation).catch(
            () => {
              console.log('Error deleting image from reference: ' + refName);
            },
          );
          this.deleteUnlessReplaced(
            imageThumbnailStorageRef,
            thumbnail.generation,
          ).catch(() => {
            console.log(
              'Error deleting image thumbnail from reference: ' + refName,
            );
          });

          this.deleteUnlessReplaced(
            imageOriginalStorageRef,
            original.generation,
          ).catch(() => {
            console.log('Error deleting video from reference: ' + refName);
          });
        }

        this.eventEmitter.emit(EVER_COUNTER_EVENTS.mediaDeleted, {
          kind: 'screenshot',
          bytes: kept ? 0 : image.bytes,
        });
      }

      if (!counted) {
        return sendError(
          'The image was deleted, but the folder item count could not be updated.',
        );
      }

      return sendResponse('Successfully deleted the image');
    } catch (e) {
      return sendError('Error while trying to delete an image', e.message);
    }
  }

  // TODO: Delete poster(thumbnail) if video is sent by email and poster is created.
  /**
   * Deletes the video `videoId` and the stored file of that video. The storage name comes from the
   * video's own record, never from the request: the route's permission check is made on `videoId`,
   * so a client-supplied file name could otherwise delete another video's file. The file stays
   * while another video of the workspace still holds the name (see `isFileNameHeld`). The folder
   * counts that lose the video are those of the folder in its record (see `removeWorkspaceItem`).
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

      const refName: unknown = videoData.refName;
      const fileName =
        typeof refName === 'string' && refName !== '' ? refName : null;
      const fileRef = fileName
        ? bucket.file(`workspaces/${workspaceId}/videos/${fileName}`)
        : null;
      // Read while the record still holds the name (see `deleteImage`).
      const file = fileRef ? await this.storedVersion(fileRef) : NOT_STORED;

      // The record goes first; only the delete that removed it deletes the files (see `deleteImage`).
      const { removed, counted } = await this.removeWorkspaceItem(
        workspaceId,
        'videos',
        videoId,
      );
      if (removed) {
        this.workspaceShareService.deleteLinkById(workspaceId, videoId);

        // A file another video still names is its file too: it stays, and no bytes are freed.
        let everStatsBytes = 0;
        if (
          fileRef &&
          !(await this.isFileNameHeld(workspaceId, 'videos', fileName))
        ) {
          everStatsBytes = file.bytes;
          this.deleteUnlessReplaced(fileRef, file.generation).catch(() => {
            console.log('Error deleting video from reference: ' + refName);
          });
        }

        // Named by the video's id, which no other item gets: an upload under the same file name
        // stores nothing here.
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

        this.eventEmitter.emit(EVER_COUNTER_EVENTS.mediaDeleted, {
          kind: 'video',
          bytes: everStatsBytes,
        });
      }

      this.eventEmitter.emit(
        'analytics.track',
        'Video deleted from workspace',
        {
          workspaceId,
          properties: { id: videoId },
        },
      );

      if (!counted) {
        return sendError(
          'The video was deleted, but the folder item count could not be updated.',
        );
      }
      return sendResponse('Video deleted successfully');
    } catch (error: any) {
      console.log(error);
      return sendError('Error while trying to delete an image', error.message);
    }
  }
}
