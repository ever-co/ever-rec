import * as admin from 'firebase-admin';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { IDbFolder, DbImgData } from 'src/interfaces/IEditorImage';
import {
  DbFolderData as DbFolderDataVideo,
  DbVideoData,
} from 'src/interfaces/IEditorVideo';
import { ConfigService } from '@nestjs/config';

type ManipulatedItems = {
  itemId: string;
  data: DbImgData | DbVideoData;
}[];

//! Warning: This service is for super admins only and is very dangerous to use
@Injectable()
export class AdminService {
  private readonly superAdminUid: string;
  private readonly superAdminEmail: string;

  constructor(private readonly configService: ConfigService) {
    const SUPER_ADMIN_ACCOUNT_UID = this.configService.get<string>(
      'SUPER_ADMIN_ACCOUNT_UID',
    );
    const SUPER_ADMIN_ACCOUNT_EMAIL = this.configService.get<string>(
      'SUPER_ADMIN_ACCOUNT_EMAIL',
    );

    if (SUPER_ADMIN_ACCOUNT_UID && SUPER_ADMIN_ACCOUNT_EMAIL) {
      this.superAdminUid = SUPER_ADMIN_ACCOUNT_UID;
      this.superAdminEmail = SUPER_ADMIN_ACCOUNT_EMAIL;
    }
  }

  //! Deletes all folders from the database, but first removes related data for items inside them (moves them to "root" folder)
  async deleteAllFolders(userId: string, email: string) {
    if (userId !== this.superAdminUid || email !== this.superAdminEmail) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    const manipulatedImages: ManipulatedItems = [];
    const manipulatedVideos: ManipulatedItems = [];
    const deletedImageFolders = [];
    const deletedVideoFolders = [];

    try {
      const db = admin.database();
      const usersRef = db.ref(`users`); // .limitToFirst(1); //!!! Use when testing
      const usersSnapshot = await usersRef.get();
      const users: any = usersSnapshot.val();

      for (const [key, value] of Object.entries(users)) {
        const uid = key;

        // @ts-ignore
        const screenshotsData: DbImgData[] = value?.screenshots;
        if (screenshotsData) {
          for (const [id, scData] of Object.entries(screenshotsData)) {
            const scId = id;
            const hasFolderId = scData?.parentId;

            if (hasFolderId) {
              const scRef = db.ref(`users/${uid}/screenshots/${scId}`);
              await scRef.update({
                parentId: false,
              });
              manipulatedImages.push({ itemId: id, data: scData });
            }
          }
        }

        // @ts-ignore
        const videosData: DbVideoData[] = value?.videos;
        if (videosData) {
          for (const [id, vidData] of Object.entries(videosData)) {
            const vidId = id;
            const hasFolderId = vidData?.parentId;

            if (hasFolderId) {
              const vidRef = db.ref(`users/${uid}/videos/${vidId}`);
              await vidRef.update({
                parentId: false,
              });
              manipulatedVideos.push({ itemId: id, data: vidData });
            }
          }
        }

        // @ts-ignore
        const screenshotsFolders: IDbFolder[] = value?.folders;
        if (screenshotsFolders) {
          const screenshotFoldersRef = db.ref(`users/${uid}/folders`);
          await screenshotFoldersRef.remove();
          deletedImageFolders.push(screenshotsFolders);
        }

        // @ts-ignore
        const videoFolders: DbFolderDataVideo = value?.videoFolders;
        if (videoFolders) {
          const videoFoldersRef = db.ref(`users/${uid}/videoFolders`);
          await videoFoldersRef.remove();
          deletedVideoFolders.push(videoFolders);
        }
      }

      return {
        message: 'Manipulation successful',
        manipulatedImages,
        manipulatedVideos,
        deletedImageFolders,
        deletedVideoFolders,
        error: null,
      };
    } catch (error: any) {
      console.log(error);
      return {
        message: 'There was an error',
        manipulatedImages,
        manipulatedVideos,
        deletedImageFolders,
        deletedVideoFolders,
        error,
      };
    }
  }
}
