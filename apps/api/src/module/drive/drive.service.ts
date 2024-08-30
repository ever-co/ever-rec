import { Readable } from 'stream';
import { Injectable } from '@nestjs/common';
import { ResStatusEnum } from '../../enums/ResStatusEnum';
import { IDataResponse, ItemType } from '../../interfaces/_types';
import jwt_decode from 'jwt-decode';
import * as admin from 'firebase-admin';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OAuth2Client } from 'google-auth-library';
import { drive_v3, google } from 'googleapis';

@Injectable()
export class DriveService {
  private readonly clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  private readonly clientId = process.env.GOOGLE_CLIENT_ID;
  private readonly redirectUrl = process.env.GOOGLE_REDIRECT_URL;
  private readonly oAuth2Clients = {};

  constructor(private eventEmitter: EventEmitter2) {}

  async getDrive(uid, user: any): Promise<drive_v3.Drive> {
    let oAuth2Client: OAuth2Client = this.oAuth2Clients[uid]
      ? this.oAuth2Clients[uid]
      : null;

    if (oAuth2Client === null) {
      oAuth2Client = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
        this.redirectUrl
      );

      if (user?.googleAPISCredentials) {
        oAuth2Client.credentials = user.googleAPISCredentials.credentials;
      }
    }

    if (!oAuth2Client) {
      throw { message: 'No OAuth client' };
    }
    return google.drive({ version: 'v3', auth: oAuth2Client });
  }

  async completeOAuth(uid: string, code: string): Promise<IDataResponse> {
    const db = admin.database();
    const userRef = db.ref(`/users/${uid}`);

    const client = this.oAuth2Clients[uid]
      ? this.oAuth2Clients[uid]
      : new google.auth.OAuth2(
          this.clientId,
          this.clientSecret,
          this.redirectUrl
        );
    return new Promise((res, rej) => {
      client.getToken(code, async (err, token) => {
        try {
          if (err) {
            rej('Error retrieving access token');
          }

          await client.setCredentials(token);
          this.oAuth2Clients[uid] = client;
          const decodedToken = jwt_decode<any>(token?.id_token);
          const userData = {
            email: decodedToken.email,
            name: decodedToken.name,
            picture: decodedToken.picture,
          };

          await userRef.update({
            googleAPISCredentials: {
              credentials: {
                access_token: token.access_token,
                refresh_token: token.refresh_token,
                expiry_date: token.expiry_date,
              },
              ...userData,
            },
          });

          this.eventEmitter.emit('analytics.track', 'Google Drive Integrated', {
            userId: uid,
          });

          res({
            status: ResStatusEnum.success,
            message: 'Success',
            error: null,
            data: userData,
          });
        } catch (e) {
          console.log(e);
          rej({
            status: ResStatusEnum.error,
            message: 'Error while trying to sign in with Google',
            error: null,
            data: null,
          });
        }
      });
    });
  }

  async driveUploadFile(
    uid: string,
    metadata: any,
    blob: Express.Multer.File,
    itemId: string,
    itemType: ItemType
  ): Promise<IDataResponse> {
    // user getting can be extracted into shared function... its 4 lines every time...
    try {
      const db = admin.database();
      const userRef = db.ref(`/users/${uid}`);
      const userSnap = await userRef.get();
      const userVal = userSnap.val();
      const collection = itemType === 'image' ? 'screenshots' : 'videos';
      const itemRef = db.ref(`/users/${uid}/${collection}/${itemId}`);
      const itemSnap = await itemRef.get();
      const itemVal = itemSnap.val();
      const drive = await this.getDrive(uid, userVal);

      const body = Readable.from(blob.buffer);
      const { name, mimeType } = JSON.parse(metadata);

      const file: any = await drive.files.create({
        requestBody: { name },
        media: { mimeType, body },
        fields: 'id',
      });

      if (itemVal) {
        const updatedDrivesData = itemVal.drivesData || [];
        updatedDrivesData.push({
          email: userVal.googleAPISCredentials.email,
          driveId: file.data.id,
        });
        await itemRef.update({ drivesData: updatedDrivesData });
        return {
          status: ResStatusEnum.success,
          message: 'Success',
          error: null,
          data: { fileId: file.data.id, drivesData: updatedDrivesData },
        };
      }
    } catch (e) {
      console.log(e);
      return {
        status: ResStatusEnum.error,
        message: e.message || 'Error while trying to upload file to the cloud.',
        error: null,
        data: null,
      };
    }
  }

  async deleteFile(uid: string, itemId: string, itemType: ItemType) {
    try {
      const db = admin.database();
      const userRef = db.ref(`/users/${uid}`);
      const userSnap = await userRef.get();
      const userVal = userSnap.val();
      const collection = itemType === 'image' ? 'screenshots' : 'videos';
      const itemRef = db.ref(`/users/${uid}/${collection}/${itemId}`);
      const itemSnap = await itemRef.get();
      const item = itemSnap.val();
      const drive = await this.getDrive(uid, userVal);

      if (item && item.drivesData && userVal) {
        const currentDriveDataIndex = item.drivesData.findIndex(
          x => x.email === userVal.googleAPISCredentials?.email
        );

        if (currentDriveDataIndex !== -1) {
          const currentDriveData = item.drivesData.find(
            x => x.email === userVal.googleAPISCredentials?.email
          );

          try {
            currentDriveData &&
              (await drive.files.delete({ fileId: currentDriveData.driveId }));
          } catch (e) {
            const error = e.errors[0];
            if (error.reason !== 'notFound') {
              return {
                status: ResStatusEnum.error,
                message:
                  error.message ||
                  'Error while trying to upload file to the cloud.',
                error: null,
                data: null,
              };
            }
          }

          const updatedDriveData = item.drivesData.slice();
          updatedDriveData.splice(currentDriveData, 1);
          await itemRef.update({ drivesData: updatedDriveData });

          return {
            status: ResStatusEnum.success,
            message: 'Drive file successfully deleted.',
            error: null,
            data: updatedDriveData,
          };
        }
      }
      return {
        status: ResStatusEnum.error,
        message: 'Error while trying to delete drive file.',
        error: null,
        data: null,
      };
    } catch (e) {
      console.log(e);
      return {
        status: ResStatusEnum.error,
        message: e.message || 'Error while trying to upload file to the cloud.',
        error: null,
        data: null,
      };
    }
  }

  async getDriveUser(uid: string) {
    const db = admin.database();
    const userRef = db.ref(`/users/${uid}`);
    const userSnap = await userRef.get();
    const userVal = userSnap.val();

    if (userVal && userVal.googleAPISCredentials) {
      try {
        const { email, name, picture } = userVal.googleAPISCredentials;

        return {
          status: ResStatusEnum.success,
          message: 'Success',
          error: null,
          data: { email, name, picture },
        };
      } catch (e) {
        console.log(e);
        return {
          status: ResStatusEnum.error,
          message: 'Error while trying to get drive user',
          error: null,
          data: null,
        };
      }
    } else {
      return {
        status: ResStatusEnum.error,
        message: 'No drive user',
        error: null,
        data: null,
      };
    }
  }

  async signOut(uid: string) {
    const db = admin.database();
    const userRef = db.ref(`users//${uid}`);
    const userSnap = await userRef.get();
    const userVal = userSnap.val();

    if (userVal) {
      await userRef.update({ googleAPISCredentials: null });
    }

    this.eventEmitter.emit('analytics.track', 'Google Drive Disconnected', {
      userId: uid,
    });

    return {
      status: ResStatusEnum.success,
      message: 'Success',
      error: null,
      data: null,
    };
  }
}
