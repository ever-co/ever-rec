import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Reference } from '@firebase/database-types';
import type { FullMetadata } from '@firebase/storage';
import { nanoid } from 'nanoid';
import moment from 'moment';
import { SharedService } from '../../services/shared/shared.service';
import { IUniqueView, IView } from '../../services/utils/models/shared.model';
import { IDataResponse } from '../../interfaces/_types';
import { ResStatusEnum } from '../../enums/ResStatusEnum';
import { DbFolderDataRaw, IDbFolder } from '../../interfaces/IEditorImage';
import { StreamServiceService } from '../video-services/streamService.service';
import { IUser, IUserShort } from '../../interfaces/IUser';
import IEditorVideo, {
  DbFolderData,
  DbVideoData,
  ISharedDataVideo,
} from '../../interfaces/IEditorVideo';
import { fixVideoWithFFMPEG } from '../../services/utils/fixVideoWithFFMPEG';
import { TMP_PATH_FIXED } from '../../enums/tmpPathsEnums';
import { join } from 'path';
import { uploadVideoToBucket } from 'src/services/utils/uploadVideoToBucket';
import {
  formatDataToArray,
  parseCollectionToArray,
} from 'src/services/utils/helpers';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { sendResponse, sendError } from '../../services/utils/sendResponse';
import { IFavoriteFolders } from '../../interfaces/Folders';

@Injectable()
export class VideoService {
  private readonly config;

  constructor(
    private readonly sharedService: SharedService,
    private eventEmitter: EventEmitter2,
    private readonly streamService: StreamServiceService,
    private readonly foldersSharedService: FoldersSharedService,
  ) {
    this.config = {
      action: 'read',
      expires: '03-01-2500', // this probaby should be calculated differently 😄
    };
  }

  async share(uid: string, videoId: string): Promise<string> {
    let link = '';
    const db = admin.database();
    const sharedRef: Reference = db.ref('sharedVideos');
    // TODO: types
    const sharedData: any = (
      await sharedRef
        .orderByChild('uidVideoId')
        .equalTo(`${uid}|${videoId}`)
        .get()
    ).val();

    if (sharedData) {
      const keys = Object.keys(sharedData);
      link = keys[0];
    } else {
      let ref: Reference;
      let id: string;

      do {
        id = nanoid(12);
        ref = db.ref(`sharedVideos/${id}`);
      } while ((await ref.get()).val());

      ref.set({
        uid,
        videoId,
        uidVideoId: `${uid}|${videoId}`,
      });
      link = id;
    }

    this.eventEmitter.emit('analytics.track', 'Video Share Link Generated', {
      userId: uid,
      properties: { link, id: videoId },
    });

    return link;
  }

  async deleteLink(uid: string, link: string): Promise<void> {
    const db = admin.database();
    const sharedRef: Reference = db.ref(`sharedVideos/${link}`);
    const snapshot = await sharedRef.get();
    if (snapshot.exists() && snapshot.val().uid === uid) {
      await snapshot.ref.remove();
    }
  }

  async deleteLinkById(uid: string, videoId: string): Promise<void> {
    const db = admin.database();
    const sharedRef: Reference = db.ref('sharedVideos');
    const snapshot = await sharedRef
      .orderByChild('uidVideoId')
      .equalTo(`${uid}|${videoId}`)
      .get();

    if (snapshot.exists()) {
      const keys = Object.keys(snapshot.val());
      const link = keys[0];
      snapshot.child(link).ref.remove();
    }
  }

  async getVideoBySharedId(
    link: string,
    isWorkspace: boolean,
  ): Promise<
    IDataResponse<{
      video: { owner: IUserShort; dbData: DbVideoData; url: string };
    }>
  > {
    try {
      const db = admin.database();
      const sharedRootDb = isWorkspace
        ? 'sharedWorkspaceItems'
        : 'sharedVideos';
      const sharedVideoRef: Reference = db.ref(sharedRootDb);
      const sharedVideoSnapshot = await sharedVideoRef
        .orderByKey()
        .equalTo(link)
        .get();
      const sharedVal = sharedVideoSnapshot.val();

      if (!sharedVal) {
        throw new Error(`No shared data for ${sharedRootDb}/${link}`);
      }

      const sharedData = Object.values(sharedVal)[0] as ISharedDataVideo;
      const videoQuery = isWorkspace
        ? `workspaces/${sharedData.workspaceId}/videos/${sharedData.itemId}`
        : `users/${sharedData.uid}/videos/${sharedData.videoId}`;
      const videoDataRef: Reference = db.ref(videoQuery);
      const videoData: DbVideoData = (await videoDataRef.get()).val();

      if (videoData && !videoData.trash) {
        const streamData = videoData?.streamData;
        let sharedLink: string;

        if (streamData) {
          sharedLink = streamData.playbackUrl;
        } else {
          const bucket = admin.storage().bucket();
          const bucketPath = isWorkspace
            ? `workspaces/${sharedData.workspaceId}/videos/${videoData.refName}`
            : `users/${sharedData.uid}/videos/${videoData.refName}`;
          const fileResponse = await bucket.file(bucketPath).getSignedUrl({
            action: 'read',
            expires: moment().add(1, 'days').format('MM-DD-YYYY'),
          });
          sharedLink = fileResponse[0];
        }

        const uid = videoData?.uid ? videoData?.uid : sharedData?.uid;
        const ownerRef = db.ref(`users/${uid}`);
        const ownerData = (await ownerRef.get()).val();
        const owner = {
          email: ownerData.email,
          displayName: ownerData.displayName,
          photoURL: ownerData.photoURL,
          id: uid,
        };

        const allViews = formatDataToArray(videoData.views);
        const chapters = parseCollectionToArray(videoData.chapters);

        return sendResponse({
          video: {
            owner,
            dbData: {
              ...videoData,
              id: videoData.id,
              views: allViews.length,
              link: sharedLink,
              commentsLength: videoData.comments?.length || 0,
              comments: null,
              chapters,
              uid,
            },
            url: sharedLink,
          },
        });
      }
    } catch (e) {
      return sendError('There was a problem getting shared video.', e.message);
    }
  }

  async uploadVideo(
    uid: string,
    blob: Express.Multer.File,
    title: string,
    duration: string,
    fullFilename: string,
  ): Promise<IEditorVideo> {
    try {
      const editorVideo: IEditorVideo = { url: '' };
      let videoDuration = duration;

      const inputPath = blob.path;
      const fixedVideoPath = join(TMP_PATH_FIXED, fullFilename);
      const { duration: ffmpegDuration, outputPath } = await fixVideoWithFFMPEG(
        inputPath,
        fixedVideoPath,
      );

      if (ffmpegDuration) {
        videoDuration = ffmpegDuration;
      }

      const res = await uploadVideoToBucket({
        uid,
        fullFilepath: outputPath,
        fullFilename,
        itemTypePath: 'videos',
      });
      const metadata = (await res.getMetadata())[0];
      const downloadUrl = (await res.getSignedUrl(this.config))[0];

      if (metadata) {
        const dbData = await this.addVideoToDb(
          uid,
          metadata,
          title,
          videoDuration,
          false,
          `${fullFilename}`,
        );
        editorVideo.ref = metadata;
        editorVideo.url = downloadUrl;
        editorVideo.dbData = dbData;
      }

      this.eventEmitter.emit('analytics.track', 'Video Uploaded', {
        userId: uid,
        properties: { url: downloadUrl, title, ...metadata },
      });

      // Should decide what to send to the Extension after and IF storageReference is resolved
      return editorVideo;
    } catch (error) {
      console.log(error);
    }
  }

  async uploadVideoFile(
    uid: string,
    blob: Express.Multer.File,
    title: string,
    duration: string,
    fullFilename: string,
    folderId?: string,
  ): Promise<IDataResponse<IEditorVideo>> {
    try {
      let videoDuration = duration;
      const editorVideo: IEditorVideo = { url: '' };

      const inputPath = blob.path;
      const fixedVideoPath = join(TMP_PATH_FIXED, fullFilename);

      const { duration: ffmpegDuration, outputPath } = await fixVideoWithFFMPEG(
        inputPath,
        fixedVideoPath,
      );

      // Set new duration calculated with FFMPEG
      if (ffmpegDuration) {
        videoDuration = ffmpegDuration;
      }

      const fileRef = await uploadVideoToBucket({
        uid,
        fullFilepath: outputPath,
        fullFilename,
        itemTypePath: 'videos',
      });
      const metadata = (await fileRef.getMetadata())[0];
      const downloadUrl = (await fileRef.getSignedUrl(this.config))[0];

      if (metadata) {
        const dbData = await this.addVideoToDb(
          uid,
          metadata,
          title,
          videoDuration,
          folderId,
          fullFilename,
        );
        editorVideo.dbData = dbData;
        editorVideo.ref = metadata;
        editorVideo.url = downloadUrl;
      }

      this.eventEmitter.emit('analytics.track', 'Video Uploaded', {
        userId: uid,
        properties: { url: downloadUrl, title, ...metadata },
      });

      return {
        status: ResStatusEnum.success,
        message: 'File converted and uploaded successfully.',
        error: null,
        data: editorVideo,
      };
    } catch (e) {
      console.log(e);
      return {
        status: ResStatusEnum.error,
        message: 'Video conversion failed...',
        error: e,
        data: null,
      };
    }
  }

  // TODO: We take comments here, parse them, even if they are limited to the first 10. We dont need that.
  // We need only the number of comments to display, not the comments themselves.That is lets say 100 videos *
  // 10 comments, its 1000 comments. We should optimize that to only send comments length here and fetch
  // comments on single video/image load.
  async getVideoFiles(
    uid: string,
    folderId: string | false,
  ): Promise<IEditorVideo[]> {
    const files: IEditorVideo[] = [];
    const db = admin.database();
    const bucket = admin.storage().bucket();

    try {
      const dbVideos = db.ref(`users/${uid}/videos/`);
      let videosQuery = dbVideos.orderByChild('parentId');

      if (folderId) {
        videosQuery = videosQuery.equalTo(folderId);
      }

      const videosSnap = await videosQuery.get();

      if (videosSnap.val()) {
        const dbVideoData: any[] = [];
        await Promise.allSettled(
          Object.entries(videosSnap.val()).map(
            async ([id, value]: [id: string, value: any]) => {
              let folderData = null;
              const {
                title,
                duration,
                refName,
                streamData,
                parentId,
                created,
                trash,
                likes,
                drivesData,
                chaptersEnabled,
              } = value;
              const allComments = this.sharedService.sanitizeCommentsFromDB(
                value.comments,
              );
              const allViews = formatDataToArray(value.views);

              if (parentId) {
                const folderRef = db.ref(
                  `users/${uid}/videoFolders/${parentId}`,
                );
                const folderSnap = await folderRef.get();
                const folderVal = folderSnap.val();

                folderData = folderVal;
              }

              if (!trash) {
                dbVideoData.push({
                  id,
                  title,
                  duration,
                  streamData,
                  refName,
                  parentId,
                  created,
                  trash,
                  drivesData,
                  comments: null,
                  commentsLength: allComments.length,
                  likes,
                  folderData,
                  views: allViews.length,
                  uid,
                  chaptersEnabled,
                });
              }
            },
          ),
        );

        await Promise.allSettled(
          dbVideoData.map(async (dbData) => {
            const streamData = dbData?.streamData;
            const refName = dbData?.refName;

            let url: string | null = null;
            if (streamData) {
              url = dbData?.streamData.playbackUrl;
            } else if (refName) {
              const video = bucket.file(`users/${uid}/videos/${refName}`);
              url = (await video.getSignedUrl(this.config))[0];
            }

            files.push({
              dbData,
              url,
            });
          }),
        );
      }
    } catch (error: any) {
      console.log(error);
      return null;
    }
    return files;
  }

  async getVideoFolders(uid: string): Promise<IDataResponse<DbFolderData[]>> {
    let folders: DbFolderData[] = [];
    const db = admin.database();

    try {
      const dbFoldersRef = db.ref(`users/${uid}/videoFolders`);
      const foldersSnap = await dbFoldersRef.get();
      const foldersVal = foldersSnap.val();

      if (foldersVal) {
        const parsedFolders =
          this.foldersSharedService.parseFoldersFromDb(foldersVal);
        folders = await this.foldersSharedService.mapDbFoldersToTreeArray(
          uid,
          true,
          'video',
          parsedFolders,
        );
      }
      return {
        status: ResStatusEnum.success,
        message: 'Success',
        error: null,
        data: folders,
      };
    } catch (error: any) {
      console.log(error);
      return {
        status: ResStatusEnum.error,
        message: 'Error while trying to get all folders.',
        error: null,
        data: null,
      };
    }
  }

  async getFolderById(
    uid: string,
    folderId?: string,
  ): Promise<IDataResponse<DbFolderData>> {
    try {
      const db = admin.database();
      const dbFoldersRef = db.ref(`users/${uid}/videoFolders/`);
      const folderSnap = await dbFoldersRef.get();
      const foldersVal = folderSnap.val();

      if (foldersVal[folderId]) {
        const folderFromDb: DbFolderDataRaw = foldersVal[folderId];
        const populatedFolder =
          await this.foldersSharedService.populateFolderChildren(
            uid,
            folderFromDb,
            'video',
          );
        const folderData: DbFolderData = { ...populatedFolder, id: folderId };

        return {
          status: ResStatusEnum.success,
          message: 'Success',
          error: null,
          data: folderData,
        };
      }
    } catch (error: any) {
      console.log(error);
      return {
        status: ResStatusEnum.error,
        message: 'Error while trying to get folder data.',
        error: null,
        data: null,
      };
    }
  }

  async createNewFolder(
    uid: string,
    name: string,
    color: string,
    rootFolderId: string,
    newId: string,
    parentId?: string,
  ): Promise<IDataResponse<DbFolderData>> {
    const db = admin.database();

    const created = new Date().toISOString();
    const folderRef = db.ref(`users/${uid}/videoFolders/${newId}`);
    const snapshot = await folderRef.get();
    let nestLevel = 0;

    if (parentId) {
      const parentFolderRef = db.ref(`users/${uid}/videoFolders/${parentId}`);
      const parentFolderSnap = await parentFolderRef.get();
      const parentFolderVal = parentFolderSnap.val();
      const folderChildren = parentFolderVal.children || [];
      nestLevel = parentFolderVal.nestLevel + 1;

      if (nestLevel > 2) {
        return {
          status: ResStatusEnum.error,
          message: 'Cannot create new folder. Nest level too deep.',
          error: null,
          data: null,
        };
      }

      parentFolderRef.update({ children: [...folderChildren, newId] });
    }
    const newFolder: DbFolderDataRaw = {
      name,
      parentId: parentId || false,
      rootFolderId: rootFolderId || false,
      children: [],
      created,
      nestLevel,
      items: 0,
      updated: created,
      color,
    };

    !snapshot.exists() && folderRef.set(newFolder);

    this.eventEmitter.emit('analytics.track', 'Folder Created', {
      userId: uid,
      properties: { title: name, parentId },
    });

    return {
      status: ResStatusEnum.success,
      message: 'Success',
      error: null,
      data: { ...newFolder, id: newId },
    };
  }

  // Also, I believe these comments can be optimized to be taken lightly. Less requests.
  async getVideoByIdPrivate(
    uid: string,
    id: string,
    type?: string,
  ): Promise<any> {
    const db = admin.database();
    const bucket = admin.storage().bucket();
    const dbVideoRef = db.ref(`users/${uid}/videos/${id}`);
    const snapshot = await dbVideoRef.get();

    if (snapshot.exists()) {
      const dbData: DbVideoData = snapshot.val();
      const allViews = formatDataToArray(dbData.views);
      const streamData = dbData?.streamData;

      if (dbData.parentId) {
        const folderRef = db.ref(
          `users/${uid}/videoFolders/${dbData.parentId}`,
        );
        const folderSnap = await folderRef.get();
        const folderVal = folderSnap.val();

        dbData.folderData = folderVal;
      }
      const folders = await this.getVideoFolders(uid);

      let url: string | null = null;
      if (streamData) {
        url = streamData.playbackUrl;
      } else {
        const video = bucket.file(`users/${uid}/videos/${dbData.refName}`);
        url = (await video.getSignedUrl(this.config))[0];
      }

      let sharedLink: string | undefined | null = null;
      sharedLink = await this.findSharedLink(uid, id);

      if (type == 'get') {
        this.eventEmitter.emit('analytics.page', {
          name: 'Video Detail Page',
          category: 'video',
          userId: uid,
        });
      }

      return {
        dbData: {
          ...dbData,
          views: allViews.length,
          comments: null,
          commentsLength: null,
          folders,
          uid,
        },
        url,
        sharedLink,
      };
    }
  }

  async updateVideoData(
    uid: string,
    id: string,
    parentId: string | false,
    trash: boolean,
    likes: { uid: string; timestamp: number }[],
    title?: string,
  ): Promise<void> {
    const db = admin.database();
    const dbVideoRef = db.ref(`users/${uid}/videos/${id}`);
    await dbVideoRef.update({
      ...(title !== undefined ? { title } : {}),
      ...(parentId !== undefined ? { parentId } : {}),
      ...(trash !== undefined ? { trash } : {}),
      ...(likes !== undefined ? { likes } : { likes: 0 }),
    });

    return this.getVideoByIdPrivate(uid, id);
  }

  async updateVideo(uid: string, blob: any, refName: string): Promise<string> {
    const bucket = admin.storage().bucket();
    const buffer = blob.buffer;
    const fileRef = bucket.file(`users/${uid}/videos/${refName}`);

    await fileRef.save(buffer);

    // create a new signed url so that the browser doesn't cache the video url with previous data ranges
    const newConfig = this.config;
    newConfig.expires = new Date().getTime() + 1000 * 60 * 60 * 24 * 365;
    const [url] = await fileRef.getSignedUrl(newConfig);

    return url;
  }

  async deleteVideo(
    uid: string,
    videoId: string,
    refName: string,
  ): Promise<string> {
    try {
      const db = admin.database();
      const bucket = admin.storage().bucket();

      videoId && this.deleteLinkById(uid, videoId);

      const videoRef: Reference = db.ref(`users/${uid}/videos/${videoId}`);
      const videoData: DbVideoData = (await videoRef.get()).val();

      if (videoData?.posterRef) {
        const posterRef = bucket.file(
          `users/${uid}/videoPosters/${videoData.posterRef}`,
        );
        await posterRef.delete();
      }

      const assetId = videoData?.streamData?.assetId;
      const serviceType = videoData?.streamData?.serviceType;
      this.streamService.deleteAsset(assetId, serviceType).catch(() => {
        console.log(
          `Error deleting asset from service ${serviceType}: ${assetId}`,
        );
      });

      const storageScreenRef = bucket.file(`users/${uid}/videos/${refName}`);
      storageScreenRef.delete().catch(() => {
        console.log('Error deleting video from reference: ' + refName);
      });

      bucket
        .deleteFiles({
          prefix: `users/${uid}/videosThumbnails/${videoId}/`,
        })
        .catch((error) => {
          console.log('Error deleting video chapters:', error);
        });

      await videoRef.remove();

      this.eventEmitter.emit('analytics.track', 'Video Trashed', {
        userId: uid,
        properties: { id: videoId },
      });

      // TODO: send response object
      return 'Video deleted successfully';
    } catch (error: any) {
      // TODO: send error object
      console.log(error);
      return error.message;
    }
  }

  async deleteAllVideos(
    uid: string,
    trashedVideos: IEditorVideo[],
  ): Promise<IEditorVideo[]> {
    const deletedVideos: IEditorVideo[] = [];

    await Promise.allSettled(
      trashedVideos.map(async (video) => {
        await this.deleteVideo(uid, video.dbData?.id, video.dbData.refName);
        deletedVideos.push(video);
      }),
    );

    this.eventEmitter.emit('analytics.track', 'All Video Trashed');

    return deletedVideos;
  }

  async getAllShared(uid: string): Promise<IEditorVideo[]> {
    const db = admin.database();
    const bucket = admin.storage().bucket();

    const sharedVideos: IEditorVideo[] = [];
    const dbSharedRef = db.ref(`sharedVideos`);
    const sharedQuery = dbSharedRef.orderByChild('uid').equalTo(`${uid}`);
    const sharedVideo = await sharedQuery.get();

    const sharedData: { link: string; videoId: string }[] = [];

    if (sharedVideo.val()) {
      Object.entries(sharedVideo.val()).map(([link, value]) => {
        sharedData.push({ link, videoId: (value as any).videoId });
      });

      await Promise.allSettled(
        sharedData.map(async (data) => {
          const dbVideo = db.ref(`users/${uid}/videos/${data.videoId}`);
          const snapshot = await dbVideo.get();
          const dbData: any = snapshot.val();

          if (dbData) {
            if (!dbData?.trash) {
              try {
                const allViews = formatDataToArray(dbData?.views);
                dbData.id = data.videoId;
                dbData.commentsLength = dbData?.comments?.length;
                dbData.views = allViews.length;
                const streamData = dbData?.streamData;
                const refName = dbData?.refName;

                let url: string;
                if (streamData) {
                  url = streamData.playbackUrl;
                } else if (refName) {
                  const fileRef = bucket.file(`users/${uid}/videos/${refName}`);
                  const urlResponse = await fileRef.getSignedUrl(this.config);
                  url = urlResponse[0];
                }

                sharedVideos.push({
                  url,
                  dbData: { ...dbData, uid },
                  sharedLink: data.link,
                });
              } catch (error: any) {
                console.error(error);
              }
            }
          }
        }),
      );
    }

    return sharedVideos;
  }

  async getAllTrashed(uid: string): Promise<IEditorVideo[]> {
    const trashVideos: IEditorVideo[] = [];
    const db = admin.database();
    const bucket = admin.storage().bucket();

    const dbVideos = db.ref(`users/${uid}/videos/`);
    const videosQuery = dbVideos.orderByChild('trash').equalTo(true);
    const videosSnap = await videosQuery.get();

    if (videosSnap.val()) {
      const dbVideoData: DbVideoData[] = [];
      Object.entries(videosSnap.val()).forEach(
        ([id, value]: [id: string, value: any]) => {
          const {
            title,
            refName,
            streamData,
            parentId,
            created,
            trash,
            likes,
          } = value;

          const allViews = formatDataToArray(value.views);
          dbVideoData.push({
            id,
            title,
            refName,
            streamData,
            parentId,
            created,
            trash,
            likes,
            views: allViews.length,
            uid,
          });
        },
      );

      await Promise.allSettled(
        dbVideoData.map(async (dbData) => {
          const videoRef = bucket.file(`users/${uid}/videos/${dbData.refName}`);

          const url = (await videoRef.getSignedUrl(this.config))[0];
          trashVideos.push({
            dbData,
            url,
          });
        }),
      );
    }

    return trashVideos;
  }

  async updateVideoFolderData(
    uid: string,
    folderId: string,
    name: string,
    parentId: string,
    items: number,
    color: string,
  ): Promise<
    IDataResponse<{ folder: IDbFolder; favFolders: IFavoriteFolders } | null>
  > {
    const db = admin.database();
    const updated = new Date().toISOString();

    const favFoldersRef = db.ref(`users/${uid}/favoriteFolders`);
    const favFoldersSnap = await favFoldersRef.get();
    const favFolders = favFoldersSnap.val();

    const parsedFavVideoFolders = favFolders?.videos
      ? parseCollectionToArray(favFolders.videos)
      : [];
    const favFoldersIndex = parsedFavVideoFolders.findIndex(
      (x) => x.id === folderId,
    );

    if (favFoldersIndex !== -1) {
      parsedFavVideoFolders[favFoldersIndex].name = name;
    }

    const dbFolderRef = db.ref(`users/${uid}/videoFolders/${folderId}`);

    await Promise.all([
      favFoldersRef.set(favFolders),
      dbFolderRef.update({
        ...(name !== undefined ? { name: name } : {}),
        ...(parentId !== undefined ? { parentId: parentId } : {}),
        ...(items !== undefined ? { items } : { items: 0 }),
        ...(updated !== undefined ? { updated } : { updated }),
        ...(color !== undefined ? { color } : { color }),
      }),
    ]);

    const newFolderSnap = await dbFolderRef.get();
    const thisIsBullshit = newFolderSnap.val();

    return sendResponse<{ folder: IDbFolder; favFolders: IFavoriteFolders }>({
      folder: thisIsBullshit,
      favFolders,
    });
  }

  // Helpers
  async addVideoToDb(
    uid: string,
    meta: FullMetadata,
    title: string,
    duration: string,
    parentId: string | false,
    refName: string,
  ): Promise<DbVideoData> {
    const db = admin.database();

    const videoRef = db.ref(`users/${uid}/videos`);
    const newVideoRef = videoRef.push();
    const id = newVideoRef.key;

    const newVideo: any = {
      refName,
      title,
      duration,
      trash: false,
      created: meta.timeCreated,
      parentId: parentId ? parentId : false,
      likes: 0,
      uid,
      id,
    };

    await newVideoRef.set(JSON.parse(JSON.stringify(newVideo)));

    return { ...newVideo, uid };
  }

  async findSharedLink(uid: string, id: string): Promise<string> {
    const db = admin.database();
    const dbSharedRef = db.ref(`sharedVideos`);
    const sharedQuery = dbSharedRef
      .orderByChild('uidVideoId')
      .equalTo(`${uid}|${id}`);
    const sharedSnap = await sharedQuery.get();

    if (sharedSnap.val()) {
      const links = Object.keys(sharedSnap.val());
      return links?.length ? links[0] : undefined;
    }
  }

  async getPoster(uid: string, videoId: string): Promise<string | false> {
    let link: string | false = false;

    const db = admin.database();
    const bucket = admin.storage().bucket();

    const dbVideoRef: Reference = db.ref(`users/${uid}/videos/${videoId}`);
    const videoDb: DbVideoData = (await dbVideoRef.get()).val();
    if (videoDb) {
      if (videoDb.posterRef) {
        const video = bucket.file(
          `users/${uid}/videoPosters/${videoDb.posterRef}`,
        );
        const url = (await video.getSignedUrl(this.config))[0];
        link = url;
      }
    }
    return link;
  }

  async setPoster(
    uid: string,
    templateBase64: any,
    { fullFilename, videoId }: { fullFilename: string; videoId: string },
  ): Promise<string | false> {
    let link: string | false = false;

    if (templateBase64 && fullFilename) {
      const res = await uploadVideoToBucket({
        uid,
        fullFilepath: templateBase64,
        fullFilename,
        itemTypePath: 'videoPosters',
      });
      const downloadUrl = (await res.getSignedUrl(this.config))[0];

      if (downloadUrl) {
        const db = admin.database();
        const dbImageRef = db.ref(`users/${uid}/videos/${videoId}`);

        await dbImageRef.update({
          ...(fullFilename && { posterRef: fullFilename }),
        });

        link = downloadUrl;
      }
      return link;
    } else {
      return link;
    }
  }
}
