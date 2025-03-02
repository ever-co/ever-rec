import * as admin from 'firebase-admin';
import sharp from 'sharp';
import moment from 'moment';
import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { Reference } from '@firebase/database-types';
import { SharedService } from '../../services/shared/shared.service';
import type { FullMetadata } from '@firebase/storage';
import IEditorImage, {
  IDbFolder,
  DbImgData,
  DbFolderDataRaw,
  ISharedDataImage,
} from '../../interfaces/IEditorImage';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IDataResponse } from '../../interfaces/_types';
import { ResStatusEnum } from '../../enums/ResStatusEnum';
import {
  formatDataToArray,
  parseCollectionToArray,
} from 'src/services/utils/helpers';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { IFavoriteFolders } from '../../interfaces/Folders';
import { sendError, sendResponse } from 'src/services/utils/sendResponse';
import { EditorGateway } from '../editor-websocket-module/editor.gateway';
@Injectable()
export class ImageService {
  private readonly config;

  constructor(
    private readonly sharedService: SharedService,
    private readonly foldersSharedService: FoldersSharedService,
    private eventEmitter: EventEmitter2,
    private editorGateway: EditorGateway,
  ) {
    this.config = {
      action: 'read',
      expires: '03-01-2500',
    };
  }

  /**
   * @internal
   */
  async getImageOrItsThumbnailRef(uid: string, refName: string) {
    const bucket = admin.storage().bucket();
    const thumbnailExists = (
      await bucket
        .file(`users/${uid}/screenshots/thumbnails/${refName}`)
        .exists()
    )[0];
    const imgRef = thumbnailExists
      ? bucket.file(`users/${uid}/screenshots/thumbnails/${refName}`)
      : bucket.file(`users/${uid}/screenshots/${refName}`);

    return imgRef;
  }

  async share(uid: string, imageId: string): Promise<string> {
    try {
      const db = admin.database();
      const query = `${uid}|${imageId}`;

      const sharedRef: Reference = db.ref('shared');
      const snapshot = await sharedRef
        .orderByChild('uidImageId')
        .equalTo(query)
        .get();
      const queryData = snapshot.val();

      let link = '';
      if (queryData) {
        const keys = Object.keys(queryData);
        link = keys[0];
      } else {
        const id = nanoid(12);
        const ref = db.ref(`shared/${id}`);

        await ref.set({
          uid,
          imageId,
          uidImageId: query,
        });

        link = id;
      }

      this.eventEmitter.emit('analytics.track', 'Image Share Link Generated', {
        userId: uid,
        properties: { link, id: imageId },
      });

      return link;
    } catch (e) {
      console.log(e);
    }
  }

  async deleteSharedImageById(uid: string, link: string): Promise<void> {
    const db = admin.database();
    const sharedRef: Reference = db.ref(`shared/${link}`);
    const snapshot = await sharedRef.get();

    if (snapshot.exists() && snapshot.val().uid === uid) {
      await snapshot.ref.remove();
    }
  }

  async deleteSharedImageByImageId(
    uid: string,
    imageId: string,
  ): Promise<void> {
    const db = admin.database();
    const sharedRef: Reference = db.ref('shared');
    const snapshot = await sharedRef
      .orderByChild('uidImageId')
      .equalTo(`${uid}|${imageId}`)
      .get();
    if (snapshot.exists()) {
      const keys = Object.keys(snapshot.val());
      const link = keys[0];
      snapshot.child(link).ref.remove();
    }
  }

  async getImageBySharedId(
    link: string,
    isWorkspace: boolean,
  ): Promise<{ image: { owner: any; dbData: DbImgData } }> {
    try {
      const db = admin.database();
      const sharedRootDb = isWorkspace ? 'sharedWorkspaceItems' : 'shared';
      const sharedRef: Reference = db.ref(sharedRootDb);
      const sharedSnapshot = await sharedRef.orderByKey().equalTo(link).get();
      const sharedData = sharedSnapshot.val();

      if (!sharedData) {
        throw new Error(`No shared data for ${sharedRootDb}/${link}`);
      }

      const shared = Object.values(sharedData)[0] as ISharedDataImage;
      const imageQuery = isWorkspace
        ? `workspaces/${shared.workspaceId}/screenshots/${shared.itemId}`
        : `users/${shared.uid}/screenshots/${shared.imageId}`;
      const imageRef = db.ref(imageQuery);
      const imageSnapshot = await imageRef.get();
      const imageData: DbImgData = imageSnapshot.val();

      if (imageData && !imageData.trash) {
        const bucket = admin.storage().bucket();
        const bucketPath = isWorkspace
          ? `workspaces/${shared.workspaceId}/screenshots/${imageData.refName}`
          : `users/${shared.uid}/screenshots/${imageData.refName}`;
        const sharedLink = await bucket.file(bucketPath).getSignedUrl({
          action: 'read',
          expires: moment().add(1, 'days').format('MM-DD-YYYY'),
        });

        /*  const views = imageData.views ? imageData.views + 1 : 1;
        imgDataRef.update({ views }); */

        const ownerRef = db.ref(`users/${imageData.uid}`);
        const ownerSnap = await ownerRef.get();
        const ownerVal = ownerSnap.val();
        const owner = {
          email: ownerVal.email,
          displayName: ownerVal.displayName,
          photoURL: ownerVal.photoURL,
          id: imageData.uid,
        };

        const views = Array.isArray(imageData.views)
          ? imageData.views.length
          : 0;

        return {
          image: {
            owner,
            dbData: {
              id: shared.imageId,
              ...imageSnapshot.val(),
              views,
              link: sharedLink[0],
              commentsLength: imageData.comments?.length || 0,
              comments: null,
              uid: imageData.uid,
            },
          },
        };
      }
    } catch (error: any) {
      console.log(error);
      return null;
    }
  }

  async updateOriginalImageFromBucket(
    uid: string,
    fullFileName: string,
    fileData: string | Express.Multer.File,
  ): Promise<any> {
    const bucket = admin.storage().bucket();
    const file = bucket.file(
      `users/${uid}/screenshots/originals/${fullFileName}`,
    );
    let fileBuffer: Buffer;
    if (typeof fileData === 'string') {
      const getBase64Data = (encoded) => {
        const base64EncodedString = encoded.replace(
          /^data:\w+\/\w+;base64,/,
          '',
        );
        return base64EncodedString;
      };
      const photoData = getBase64Data(fileData);
      fileBuffer = Buffer.from(photoData, 'base64');
    } else {
      fileBuffer = fileData.buffer;
    }

    await file.save(fileBuffer);

    return file;
  }

  async uploadImageInBucket(
    fileData: string | Express.Multer.File,
    uid: string,
    fullFileName: string,
  ): Promise<any> {
    const bucket = admin.storage().bucket();
    const file = bucket.file(`users/${uid}/screenshots/${fullFileName}`);
    const thumbnail = bucket.file(
      `users/${uid}/screenshots/thumbnails/${fullFileName}`,
    );
    let fileBuffer: Buffer;

    if (typeof fileData === 'string') {
      const getBase64Data = (encoded) => {
        const base64EncodedString = encoded.replace(
          /^data:\w+\/\w+;base64,/,
          '',
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

    await Promise.all([file.save(fileBuffer), thumbnail.save(thumbnailBuffer)]);

    return file;
  }

  async saveOriginalImageInBucket(
    uid: string,
    fullFileName: string,
  ): Promise<any> {
    const bucket = admin.storage().bucket();

    const file = bucket
      .file(`users/${uid}/screenshots/${fullFileName}`)
      .copy(`users/${uid}/screenshots/originals/${fullFileName}`);

    return file;
  }

  async getUploadedFileByDbId(uid: string, id: string) {
    const db = admin.database();
    const bucket = admin.storage().bucket();
    const imageRef = db.ref(`users/${uid}/screenshots/${id}`);
    let imageSnap = await imageRef.get();

    imageRef.on('value', (snap) => {
      imageSnap = snap;
    });

    if (imageSnap.val()) {
      const file = bucket.file(
        `users/${uid}/screenshots/${imageSnap.val().refName}`,
      );
      const metadata = (await file.getMetadata())[0];
      const url = (await file.getSignedUrl(this.config))[0];

      return { url, ref: metadata, dbData: { ...imageSnap.val(), id } };
    }

    return null;
  }

  async uploadFile(
    uid: string,
    file: Express.Multer.File,
    title: string,
    fullFileName: string,
    folderId?: string,
  ): Promise<IEditorImage> {
    if (file && title && fullFileName) {
      const editorImage: IEditorImage = { url: '' };
      const res = await this.uploadImageInBucket(file, uid, fullFileName);
      const metadata = (await res.getMetadata())[0];
      const downloadUrl = (await res.getSignedUrl(this.config))[0];
      const savedOriginal = await this.saveOriginalImage(uid, fullFileName);

      if (metadata) {
        const dbData = await this.addScreenshotToDb(
          uid,
          metadata,
          title,
          '',
          folderId,
          `${fullFileName}`,
          savedOriginal,
        );
        editorImage.ref = metadata;
        editorImage.url = downloadUrl;
        editorImage.dbData = dbData;
      }

      this.eventEmitter.emit('analytics.track', 'Image Uploaded', {
        userId: uid,
        properties: { title, url: downloadUrl, uid },
      });

      // Should decide what to send to the Extension after and IF storageReference is resolved
      return editorImage;
    } else {
      console.log('in null');
      return null;
    }
  }

  async saveOriginalImage(uid: string, fullFileName: string) {
    const bucket = admin.storage().bucket();
    if (uid && fullFileName) {
      try {
        const res = await this.saveOriginalImageInBucket(uid, fullFileName);

        if (res) {
          const copiedfile = bucket.file(
            `users/${uid}/screenshots/originals/${fullFileName}`,
          );

          const downloadUrl = (await copiedfile.getSignedUrl(this.config))[0];
          return downloadUrl;
        }
      } catch (error: any) {
        console.log(error);
      }
    }
  }

  async getFiles(
    uid: string,
    folderId: string | false,
    type?: string,
  ): Promise<IEditorImage[]> {
    const files: IEditorImage[] = [];

    try {
      const db = admin.database();
      // const bucket = admin.storage().bucket();
      const dbImages = db.ref(`users/${uid}/screenshots`);
      let imagesQuery = dbImages.orderByChild('parentId');

      console.log('value:', uid);
      if (folderId) {
        imagesQuery = imagesQuery.equalTo(folderId);
      }

      const imagesSnap = await imagesQuery.get();

      if (imagesSnap.val()) {
        const dbImagesData = [];
        const images = imagesSnap.val();

        await Promise.allSettled(
          Object.entries(images).map(
            async ([id, value]: [id: string, value: any]) => {
              let folderData: IDbFolder;
              const {
                title,
                refName,
                parentId,
                created,
                trash,
                likes,
                drivesData,
                sourceUrl,
                stage,
                originalImage,
                markers,
              } = value;
              const comments = db.ref(`users/${uid}/videos/${id}/comments`);
              const newComments = await comments.get();
              const gettedComments = newComments.val();

              const allComments =
                this.sharedService.sanitizeCommentsFromDB(gettedComments);
              console.log('newComments:', allComments);
              const allViews = formatDataToArray(value.views);
              if (parentId) {
                const folderRef = db.ref(`users/${uid}/folders/${parentId}`);
                const folderSnap = await folderRef.get();
                const folderVal = folderSnap.val();

                folderData = folderVal;
              }
              if (!trash) {
                const imageData: DbImgData = {
                  id,
                  title,
                  refName,
                  parentId,
                  created,
                  trash,
                  comments: null,
                  commentsLength: allComments.length,
                  likes,
                  views: allViews.length,
                  drivesData,
                  folderData,
                  sourceUrl,
                  uid,
                  stage,
                  originalImage,
                  markers,
                };
                dbImagesData.push(imageData);
              }
            },
          ),
        );

        await Promise.allSettled(
          dbImagesData.map(async (dbData) => {
            const imgRef = await this.getImageOrItsThumbnailRef(
              uid,
              dbData.refName,
            );
            const url = (await imgRef.getSignedUrl(this.config))[0];
            files.push({ dbData, url });
          }),
        );
      }
    } catch (error: any) {
      console.log(error);
      return null;
    }
    if (type) {
      this.eventEmitter.emit('analytics.page', {
        name: 'Image Page',
        category: 'media',
        userId: uid,
      });
    }
    return files;
  }

  async getAllFolders(uid: string): Promise<IDataResponse<IDbFolder[] | null>> {
    let folders: IDbFolder[] = [];
    const db = admin.database();

    try {
      const dbFolders = db.ref(`users/${uid}/folders`);
      const foldersSnap = await dbFolders.get();
      const foldersVal = foldersSnap.val();

      if (foldersVal) {
        const parsedFolders =
          this.foldersSharedService.parseFoldersFromDb(foldersVal);
        folders = await this.foldersSharedService.mapDbFoldersToTreeArray(
          uid,
          true,
          'image',
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
  ): Promise<IDataResponse<IDbFolder>> {
    try {
      const db = admin.database();
      const dbFoldersRef = db.ref(`users/${uid}/folders`);
      const dbFoldersSnap = await dbFoldersRef.get();
      const dbFoldersVal = dbFoldersSnap.val();

      if (dbFoldersVal[folderId]) {
        const folderFromDb: DbFolderDataRaw = dbFoldersVal[folderId];
        const populatedFolder =
          await this.foldersSharedService.populateFolderChildren(
            uid,
            folderFromDb,
            'image',
          );
        const folderData: IDbFolder = { ...populatedFolder, id: folderId };

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

  async uploadScreenshot(
    uid: string,
    imgBase64: string,
    title: string,
    sourceUrl: string | undefined,
    fullFileName: string,
  ): Promise<IEditorImage> {
    if (imgBase64 && title && fullFileName) {
      const editorImage: IEditorImage = { url: imgBase64 };
      const res = await this.uploadImageInBucket(imgBase64, uid, fullFileName);
      const metadata = (await res.getMetadata())[0];
      const downloadUrl = (await res.getSignedUrl(this.config))[0];
      const savedOriginal = await this.saveOriginalImage(uid, fullFileName);

      if (metadata) {
        const dbData = await this.addScreenshotToDb(
          uid,
          metadata,
          title,
          sourceUrl,
          false,
          `${fullFileName}`,
          savedOriginal,
        );
        editorImage.ref = metadata;
        editorImage.url = downloadUrl;
        editorImage.dbData = dbData;
      }
      this.eventEmitter.emit('analytics.track', 'Screenshot Uploaded', {
        userId: uid,
        properties: { title, url: downloadUrl, uid },
      });
      return editorImage;
    } else {
      console.log('in null');
      return null;
    }
  }

  async getImageByIdPrivate(
    uid: string,
    id: string,
    type?: string,
  ): Promise<IEditorImage> {
    let image: IEditorImage | null = null;

    const db = admin.database();
    const dbImageRef = db.ref(`users/${uid}/screenshots/${id}`);
    const snapshot = await dbImageRef.get();

    if (snapshot.exists()) {
      const dbData: any = snapshot.val();
      const allViews = formatDataToArray(dbData.views);
      dbData.id = id;
      if (dbData.parentId) {
        const folderRef = db.ref(`users/${uid}/folders/${dbData.parentId}`);
        const folderSnap = await folderRef.get();
        const folderVal = folderSnap.val();

        dbData.folderData = folderVal;
      }
      const folders = await this.getAllFolders(uid);
      const bucket = admin.storage().bucket();
      const file = bucket.file(`users/${uid}/screenshots/${dbData.refName}`);

      const url = (await file.getSignedUrl(this.config))[0];
      const sharedLink: string | undefined = await this.findSharedLink(uid, id);
      image = {
        dbData: {
          ...dbData,
          views: allViews.length,
          comments: null,
          commentsLength: null,
          folders: folders.data || [],
          uid,
        },
        url,
        sharedLink,
      };
      if (type == 'get') {
        this.eventEmitter.emit('analytics.page', {
          name: 'Image Detail Page',
          category: 'image',
          userId: uid,
        });
      }
      return image;
    }

    return null;
  }

  async updateImage(
    uid: string,
    blob: any,
    refName: string,
    location: string,
  ): Promise<string> {
    const bucket = admin.storage().bucket();
    const file = bucket.file(
      `users/${uid}/screenshots/${refName ? refName : location}`,
    );
    const thumbnail = bucket.file(
      `users/${uid}/screenshots/thumbnails/${refName ? refName : location}`,
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

    await Promise.all([file.save(buffer), thumbnail.save(thumbnailBuffer)]);

    // if we use this.config, it sends the same config as previous file to firebase storage.
    // this in return returns the same URL, so front end thinks we have the same file and dont downloads the new.
    return (
      await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 1000 * 15778476000,
      })
    )[0];
  }

  async updateImageData(
    uid: string,
    id: string,
    parentId: string | false,
    trash: boolean,
    likes: { uid: string; timestamp: number }[],
    title?: string,
    stage?: any,
    originalImage?: string,
    markers?: string,
  ): Promise<IEditorImage> {
    const db = admin.database();
    const dbImageRef = db.ref(`users/${uid}/screenshots/${id}`);

    await dbImageRef.update({
      ...(title !== undefined ? { title } : {}),
      ...(parentId !== undefined ? { parentId } : {}),
      ...(trash !== undefined ? { trash } : {}),
      ...(likes !== undefined ? { likes } : { likes: 0 }),
      ...(stage !== undefined ? { stage } : {}),
      ...(originalImage !== undefined ? { originalImage } : {}),
      ...(markers !== undefined ? { markers } : {}),
    });

    if (markers !== undefined) {
      this.editorGateway.emitMarkerUpdate(uid, id, markers);
    }

    return this.getImageByIdPrivate(uid, id);
  }

  async deleteImage(
    uid: string,
    imageId: string,
    refName: string,
  ): Promise<void> {
    const db = admin.database();
    const bucket = admin.storage().bucket();
    const screenRef = db.ref(`users/${uid}/screenshots/${imageId}`);
    const dataSnapshot = await screenRef.get();
    const data = dataSnapshot.val();
    const storageScreenRef = bucket.file(`users/${uid}/screenshots/${refName}`);
    const storageOriginalScreenRef = bucket.file(
      `users/${uid}/screenshots/originals/${refName}`,
    );
    const storageThumbnailScreenRef = bucket.file(
      `users/${uid}/screenshots/thumbnails/${refName}`,
    );

    await Promise.all([
      this.deleteSharedImageByImageId(uid, imageId),
      screenRef.remove(),
      storageScreenRef.delete(),
      storageOriginalScreenRef.delete(),
      storageThumbnailScreenRef.delete(),
    ]);

    this.eventEmitter.emit('analytics.track', 'Image Trashed', {
      userId: uid,
      properties: { name: data.name, id: imageId },
    });
  }

  async deleteAllImages(
    uid: string,
    trashedImages: IEditorImage[],
  ): Promise<void> {
    await Promise.allSettled(
      trashedImages.map(async (image) => {
        await this.deleteImage(uid, image.dbData?.id, image.dbData.refName);
      }),
    );
  }

  async getAllShared(uid: string): Promise<IEditorImage[]> {
    const shared: IEditorImage[] = [];
    const db = admin.database();
    const bucket = admin.storage().bucket();
    const dbSharedRef = db.ref(`shared`);
    const sharedQuery = dbSharedRef.orderByChild('uid').equalTo(`${uid}`);
    const sharedSnap = await sharedQuery.get();

    const sharedData: { link: string; imageId: string }[] = [];

    if (sharedSnap.val()) {
      Object.entries(sharedSnap.val()).map(([link, value]) => {
        sharedData.push({
          link,
          imageId: (value as any).imageId,
        });
      });

      await Promise.allSettled(
        sharedData.map(async (data) => {
          const dbImage = db.ref(`users/${uid}/screenshots/${data.imageId}`);
          const snapshot = await dbImage.get();

          if (snapshot.val()) {
            const dbData: any = snapshot.val();
            if (!dbData.trash) {
              dbData.id = data.imageId;
              const allViews = formatDataToArray(dbData.views);
              dbData.views = allViews.length;
              dbData.commentsLength = dbData?.comments?.length;
              const imgRef = await this.getImageOrItsThumbnailRef(
                uid,
                dbData.refName,
              );
              const url = (await imgRef.getSignedUrl(this.config))[0];
              shared.push({
                url,
                dbData: dbData,
                sharedLink: data.link,
              });
            }
          }
        }),
      );

      this.eventEmitter.emit('analytics.track', 'All Image Shared', {
        userId: uid,
      });
    }
    return shared;
  }

  async getAllTrashed(uid: string): Promise<IEditorImage[]> {
    const trashed: IEditorImage[] = [];
    const db = admin.database();
    const bucket = admin.storage().bucket();

    const dbImages = db.ref(`users/${uid}/screenshots/`);
    const imagesQuery = dbImages.orderByChild('trash').equalTo(true);
    const imagesSnap = await imagesQuery.get();

    if (imagesSnap.val()) {
      const dbImagesData: DbImgData[] = [];
      Object.entries(imagesSnap.val()).forEach(
        ([id, value]: [id: string, value: any]) => {
          const { title, refName, parentId, created, trash, likes } = value;
          const allViews = formatDataToArray(value.views);
          dbImagesData.push({
            id,
            title,
            refName,
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
        dbImagesData.map(async (dbData) => {
          const imgRef = await this.getImageOrItsThumbnailRef(
            uid,
            dbData.refName,
          );
          const url = (await imgRef.getSignedUrl(this.config))[0];

          trashed.push({ dbData, url });
        }),
      );

      this.eventEmitter.emit('analytics.page', {
        name: 'Trash Page',
        category: 'media',
        userId: uid,
      });
    }

    return trashed;
  }

  async createNewFolder(
    uid: string,
    name: string,
    color: string,
    rootFolderId: string | false,
    newId: string,
    parentId: string | false,
  ): Promise<IDataResponse<IDbFolder>> {
    const db = admin.database();

    const created = new Date().toISOString();
    const folderRef = db.ref(`users/${uid}/folders/${newId}`);
    const snapshot = await folderRef.get();
    let nestLevel = 0;

    if (parentId) {
      const parentFolderRef = db.ref(`users/${uid}/folders/${parentId}`);
      const parentFolderSnap = await parentFolderRef.get();
      const parentFolderVal = parentFolderSnap.val();
      const folderChildren = parentFolderVal.children || [];

      if (nestLevel > 2) {
        return {
          status: ResStatusEnum.error,
          message: 'Cannot create new folder. Nest level too deep.',
          error: null,
          data: null,
        };
      }

      parentFolderRef.update({ children: [...folderChildren, newId] });
      nestLevel = parentFolderVal.nestLevel + 1;
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

    // if (rootFolderId) {
    //   // Add new folder to children of root folder
    //   const rootFolderChildren = db.ref(
    //     `users/${uid}/folders/${rootFolderId}/children`,
    //   );
    //   rootFolderChildren.update({ [newId]: true });
    // }

    return {
      status: ResStatusEnum.success,
      message: 'Success',
      error: null,
      data: { ...newFolder, id: newId },
    };
  }

  async updateFolderData(
    uid: string,
    folderId: string,
    name: string,
    parentId: string,
    items: number,
    color: string,
  ): Promise<
    IDataResponse<{ folder: IDbFolder; favFolders: IFavoriteFolders } | null>
  > {
    try {
      const db = admin.database();
      const dbFolderRef = db.ref(`users/${uid}/folders/${folderId}`);
      const dataSnapshot = await dbFolderRef.get();
      const data = dataSnapshot.val();
      const updated = new Date().toISOString();
      const favFoldersRef = db.ref(`users/${uid}/favoriteFolders`);
      const favFoldersSnap = await favFoldersRef.get();
      const favFolders = favFoldersSnap.val();

      const parsedFavImageFolders = favFolders?.images
        ? parseCollectionToArray(favFolders.images)
        : [];
      const favFoldersIndex = parsedFavImageFolders.findIndex(
        (x) => x.id === folderId,
      );

      if (favFoldersIndex !== -1) {
        parsedFavImageFolders[favFoldersIndex].name = name;
      }

      const updatedFolder = {
        ...(name !== undefined ? { name: name } : {}),
        ...(parentId !== undefined ? { parentId: parentId } : {}),
        ...(items !== undefined ? { items } : { items: 0 }),
        ...(updated !== undefined ? { updated } : { updated }),
        ...(color !== undefined ? { color } : { color }),
      };

      await Promise.all([
        favFoldersRef.set(favFolders),
        dbFolderRef.update(updatedFolder),
      ]);

      const newFolderSnap = await dbFolderRef.get();
      const newFolderData = newFolderSnap.val();

      this.eventEmitter.emit('analytics.track', 'Folder Name Changed', {
        userId: uid,
        properties: { oldName: data.name, newName: name },
      });

      return sendResponse<{ folder: IDbFolder; favFolders: IFavoriteFolders }>({
        folder: newFolderData,
        favFolders,
      });
    } catch (err) {
      console.log(err);
      return sendError('Could not update folder data.');
    }
  }

  // "Helpers"
  async addScreenshotToDb(
    uid: string,
    meta: FullMetadata,
    title: string,
    sourceUrl: string,
    parentId: string | false,
    refName: string,
    originalImage: string,
  ): Promise<DbImgData | null> {
    try {
      const db = admin.database();
      const id = nanoid(24);
      const newImageRef = db.ref(`users/${uid}/screenshots/${id}`);

      const newScreenshot: DbImgData = {
        id,
        uid,
        refName,
        title,
        parentId: parentId ? parentId : false,
        created: meta.timeCreated,
        likes: [],
        views: 0,
        trash: false,
        sourceUrl,
        originalImage: originalImage,
      };

      await newImageRef.set(JSON.parse(JSON.stringify(newScreenshot)));

      return newScreenshot;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async findSharedLink(uid: string, id: string): Promise<string | undefined> {
    if (uid) {
      try {
        const db = admin.database();
        const dbSharedRef = db.ref(`shared`);
        const sharedQuery = dbSharedRef
          .orderByChild('uidImageId')
          .equalTo(`${uid}|${id}`);
        const sharedSnap = await sharedQuery.get();

        if (sharedSnap.val()) {
          const links = Object.keys(sharedSnap.val());
          return links?.length ? links[0] : undefined;
        }
      } catch (error: any) {
        console.log(error);
        return undefined;
      }
    }
  }
}
