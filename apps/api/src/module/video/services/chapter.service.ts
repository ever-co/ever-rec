import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';
import { IDataResponse } from 'src/interfaces/_types';
import { sendResponse, sendError } from '../../../services/utils/sendResponse';
import { fileExtensionMap } from 'src/services/utils/fileExtensionMap';
import {
  parseCollectionToArray,
  promiseAllSettled,
} from 'src/services/utils/helpers';
import { IChapter } from 'src/interfaces/IChapter';

@Injectable()
export class VideoChapterService {
  private readonly config: any;

  constructor() {
    this.config = {
      action: 'read',
      expires: '03-01-2500',
    };
  }

  async getChapters(
    uid: string,
    videoId: string,
    workspaceId: string,
  ): Promise<IDataResponse<IChapter[]>> {
    try {
      const db = admin.database();
      const rootDb = workspaceId ? 'workspaces' : 'users';
      const parentCollection = workspaceId ? workspaceId : uid;
      const chapterRef = db.ref(
        `${rootDb}/${parentCollection}/videos/${videoId}/chapters`,
      );

      const chapterData: IChapter[] = parseCollectionToArray(
        (await chapterRef.get()).val(),
      );

      return sendResponse(chapterData);
    } catch (error) {
      console.log(error);
      return sendError(error.message);
    }
  }

  async saveChapters(
    uid: string,
    videoId: string,
    chaptersData: IChapter[],
    chaptersBlobData: IChapter[],
    thumbnailFiles: Array<Express.Multer.File>,
    workspaceId?: string,
  ) {
    try {
      const bucket = admin.storage().bucket();
      const db = admin.database();
      const rootDb = workspaceId ? 'workspaces' : 'users';
      const parentCollection = workspaceId ? workspaceId : uid;
      const chaptersRef = db.ref(
        `${rootDb}/${parentCollection}/videos/${videoId}`,
      );

      await this.checkIfVideoExists(rootDb, parentCollection, videoId);

      const mappedChapters = {};

      const chaptersBlob = [...chaptersBlobData];
      if (chaptersBlob.length > 0) {
        const thumbnailFileRefs = [];

        // Create thumbnail.save promises so we can save all in parallel
        const saveFilePromises = thumbnailFiles.map(async (file, index) => {
          const fileExtension = fileExtensionMap[file.mimetype];
          const refName = chaptersBlob[index].id + fileExtension;

          const filePath = `${rootDb}/${parentCollection}/videosThumbnails/${videoId}/${refName}`;
          const fileRef = bucket.file(filePath);

          // Tried with some preuploaded placeholder, didn't seem to work when accessing singedURL after :(
          // Let the client handle it with refName === '' if needed.
          if (fileExtension !== '.jpg') {
            chaptersBlob[index].refName = '';
            thumbnailFileRefs.push(fileRef);
            return;
          }

          chaptersBlob[index].refName = refName;
          thumbnailFileRefs.push(fileRef);

          return fileRef.save(file.buffer);
        });

        // Upload all files in parallel
        await promiseAllSettled(saveFilePromises);

        // Get Signed URLs from uploaded files
        const signedURLPromises = thumbnailFileRefs.map((ref) =>
          ref.getSignedUrl(this.config),
        );
        const signedURLs = await promiseAllSettled(signedURLPromises).then(
          (values) => values.flat(),
        );

        // Update chapters thumbnailURL and create a new Map for the database
        chaptersBlob.forEach((chapter, index) => {
          const thumbnailURL = signedURLs[index];
          const newChapter = { ...chapter, thumbnailURL };

          mappedChapters[chapter.id] = newChapter;
        });
      }

      // Map the rest of the chapters
      chaptersData.forEach((chapter) => {
        if (!mappedChapters[chapter.id]) {
          mappedChapters[chapter.id] = chapter;
        }
      });

      const chaptersMap = {
        chapters: mappedChapters,
      };

      await chaptersRef.update(chaptersMap);

      const updatedChapters = parseCollectionToArray(mappedChapters);

      this.deleteLeftoverFiles(
        updatedChapters,
        rootDb,
        parentCollection,
        videoId,
      );

      this.createChapterEnabledSetting(rootDb, parentCollection, videoId);

      return sendResponse(updatedChapters);
    } catch (error) {
      console.log(error);
      return sendError(
        // tslint:disable-next-line: quotemark
        "Something wen't wrong when saving your chapters...",
        error.message,
      );
    }
  }

  async enableChapters(
    uid: string,
    videoId: string,
    chaptersEnabled: boolean,
    workspaceId?: string,
  ): Promise<IDataResponse<string>> {
    try {
      const db = admin.database();
      const rootDb = workspaceId ? 'workspaces' : 'users';
      const parentCollection = workspaceId ? workspaceId : uid;
      const chaptersEnabledRef = db.ref(
        `${rootDb}/${parentCollection}/videos/${videoId}/`,
      );

      await chaptersEnabledRef.update({ chaptersEnabled });

      return sendResponse('Chapters enabled successfully.');
    } catch (error) {
      console.log(error);
      return sendError('Could not enable chapters.');
    }
  }

  private async checkIfVideoExists(
    rootDb: string,
    parentCollection: string,
    videoId: string,
  ): Promise<void> {
    const db = admin.database();
    const videoRef = db.ref(`${rootDb}/${parentCollection}/videos/${videoId}`);
    const videoSnapshot = await videoRef.get();
    if (!videoSnapshot.exists()) {
      throw new Error(
        `Video in path ${rootDb}/${parentCollection}/videos/${videoId} doesn't exist`,
      );
    }
  }

  private async deleteLeftoverFiles(
    chapters: IChapter[],
    rootDb: string,
    parentCollection: string,
    videoId: string,
  ) {
    try {
      const bucket = admin.storage().bucket();
      const parentPath = `${rootDb}/${parentCollection}/videosThumbnails/${videoId}/`;
      const [files] = await bucket.getFiles({
        prefix: parentPath,
      });

      const filesNames = files.map((file) => {
        const splitPath = file.name.split('/');
        const fileName = splitPath[splitPath.length - 1];
        return fileName;
      });
      const refNames = chapters.map((chapter) => chapter.refName);

      const filesToDelete = filesNames.filter(
        (fileName) => !refNames.includes(fileName),
      );

      const filesToDeletePromises = filesToDelete.map((fileName) =>
        bucket.file(parentPath + fileName).delete(),
      );

      await promiseAllSettled(filesToDeletePromises);
    } catch (error) {
      console.log(error);
    }
  }

  private async createChapterEnabledSetting(
    rootDb: string,
    parentCollection: string,
    videoId: string,
  ): Promise<boolean> {
    try {
      const db = admin.database();
      const path = `${rootDb}/${parentCollection}/videos/${videoId}/chaptersEnabled`;
      const chaptersEnabledRef = db.ref(path);
      const chaptersEnabledSnapshot = await chaptersEnabledRef.get();

      if (!chaptersEnabledSnapshot.exists()) {
        await chaptersEnabledRef.set(true);
        return true;
      }

      return false;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  /*
  async addChapter(
    uid: string,
    videoId: string,
    timestamp: string,
    content: string,
    workspaceId?: string,
  ): Promise<IDataResponse<IChapter>> {
    try {
      const db = admin.database();
      const rootDb = workspaceId ? 'workspaces' : 'users';
      const parentCollection = workspaceId ? workspaceId : uid;

      // Check if video exists before we add a new chapter to a random location
      const videoRef = db.ref(
        `${rootDb}/${parentCollection}/videos/${videoId}`,
      );
      const videoSnapshot = await videoRef.get();
      if (!videoSnapshot.exists()) {
        throw new Error(
          `Video in path ${rootDb}/${parentCollection}/videos/${videoId} doesn't exist`,
        );
      }

      const id = nanoid(6);
      const chapterRef = db.ref(
        `${rootDb}/${parentCollection}/videos/${videoId}/chapters/${id}`,
      );

      const newChapter: IChapter = {
        id,
        timestamp,
        content,
        thumbnailURL: '',
      };

      await chapterRef.set(newChapter);

      return sendResponse(newChapter);
    } catch (error) {
      console.log(error);
      return sendError(error.message);
    }
  }

  async updateChapter(
    uid: string,
    videoId: string,
    chapterId: string,
    timestamp: string,
    content: string,
    workspaceId: string,
  ): Promise<IDataResponse<IChapter>> {
    try {
      const db = admin.database();
      const rootDb = workspaceId ? 'workspaces' : 'users';
      const parentCollection = workspaceId ? workspaceId : uid;
      const chapterRef = db.ref(
        `${rootDb}/${parentCollection}/videos/${videoId}/chapters/${chapterId}`,
      );

      const updatedChapter: IChapter = {
        id: chapterId,
        timestamp,
        content,
        thumbnailURL: '',
      };

      await chapterRef.update(updatedChapter);

      return sendResponse(updatedChapter);
    } catch (error) {
      console.log(error);
      return sendError(error.message);
    }
  }

  async deleteChapter(
    uid: string,
    videoId: string,
    chapterId: string,
    workspaceId: string,
  ): Promise<IDataResponse<string>> {
    try {
      const db = admin.database();
      const rootDb = workspaceId ? 'workspaces' : 'users';
      const parentCollection = workspaceId ? workspaceId : uid;
      const chapterRef = db.ref(
        `${rootDb}/${parentCollection}/videos/${videoId}/chapters/${chapterId}`,
      );

      await chapterRef.remove();

      return sendResponse('Successfully deleted chapter:' + chapterId);
    } catch (error) {
      console.log(error);
      return sendError(error.message);
    }
  }
  */
}
