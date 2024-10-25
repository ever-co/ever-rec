import { Injectable } from '@nestjs/common';
import { ResStatusEnum } from '../../enums/ResStatusEnum';
import * as admin from 'firebase-admin';
import { EventEmitter2 } from '@nestjs/event-emitter';
import dropboxV2Api from 'dropbox-v2-api';
import * as fs from 'fs';
import { ImageService } from '../image/image.service';
import { ConfigService } from '@nestjs/config';
import { VideoService } from '../video/video.service';
import { Readable } from 'stream';
import { IDataResponse } from 'src/interfaces/_types';

@Injectable()
export class DropboxService {
  private apiKey: string;
  private apiSecrete: string;
  private redirectURI: string;
  private redirectUriPath: string = '/api/v1/dropbox/complete-oauth';
  private baseURL: string;

  constructor(
    private eventEmitter: EventEmitter2,
    private readonly imageService: ImageService,
    private readonly configService: ConfigService,
    private readonly videoService: VideoService,
  ) {
    this.apiKey = this.configService.get<string>('DROPBOX_API_KEY');
    this.apiSecrete = this.configService.get<string>('DROPBOX_API_SECRET');
    this.baseURL = this.configService.get<string>('API_BASE_URL');
    this.redirectURI = `${this.baseURL}${this.redirectUriPath}`;
  }

  async generateAuthUrl(uid): Promise<any> {
    const dropbox = dropboxV2Api.authenticate({
      client_id: this.apiKey,
      client_secret: this.apiSecrete,
      redirect_uri: this.redirectURI,
      token_access_type: 'offline', // if you need an offline long-living refresh token
      state: uid,
    });

    const userData = await this.getUserData(uid);

    if (userData && userData.dropboxAPISCredentials) {
      return {
        status: ResStatusEnum.error,
        message:
          'You have already dropbox integrated. Please refresh the page and try again.',
      };
    } else {
      return dropbox.generateAuthUrl();
    }
  }

  public async getUserData(uid: string) {
    const db = admin.database();
    const userRef = db.ref(`users/${uid}`);
    const snapshot = await userRef.get();
    const userData = snapshot.val();
    return userData;
  }

  async completeOAuth(uid: string, code: string): Promise<any> {
    const dropbox = dropboxV2Api.authenticate({
      client_id: this.apiKey,
      client_secret: this.apiSecrete,
      redirect_uri: this.redirectURI,
      token_access_type: 'offline', // if you need an offline long-living refresh token
    });

    const db = admin.database();
    const userRef = db.ref(`/users/${uid}`);

    return new Promise((res, rej) => {
      dropbox.getToken(code, async (err, result, response) => {
        try {
          if (err) {
            rej('Error retrieving access token');
          }

          if (result) {
            const userDropbox = dropboxV2Api.authenticate({
              token: result.access_token,
            });

            await userDropbox(
              {
                resource: 'users/get_account',
                parameters: {
                  account_id: result.account_id,
                },
              },
              async (accErr, accResult) => {
                if (accResult) {
                  const dropboxUserData = {
                    account_id: result.account_id,
                    email: accResult.email,
                  };

                  await userRef.update({
                    dropboxAPISCredentials: {
                      credentials: {
                        access_token: result.access_token,
                        refresh_token: result.refresh_token,
                      },
                      ...dropboxUserData,
                    },
                  });

                  res({
                    status: ResStatusEnum.success,
                    message: 'Success',
                    error: null,
                    data: 'success',
                  });
                } else {
                  rej({
                    status: ResStatusEnum.error,
                    message: 'Error while trying to sign in with dropbox',
                    error: accErr,
                    data: null,
                  });
                }
              },
            );
          }
        } catch (e) {
          rej({
            status: ResStatusEnum.error,
            message: 'Error while trying to sign in with dropbox',
            error: e,
            data: null,
          });
        }
      });
    });
  }

  async refreshToken(refresh_token, req): Promise<any> {
    const dropbox = dropboxV2Api.authenticate({
      client_id: this.apiKey,
      client_secret: this.apiSecrete,
      redirect_uri: this.redirectURI,
      token_access_type: 'offline',
    });
    await dropbox.refreshToken(refresh_token, async (err, response) => {
      if (err) {
        console.log(err, 'err');
        return {
          status: ResStatusEnum.error,
          message: 'Error while trying to upload dropbox',
          error: err.code,
          data: null,
        };
      }
      if (response) {
        if (response.access_token) {
          const db = admin.database();
          const userRef = db.ref(`/users/${req?.user.id}`);
          const snapshot = await userRef.get();
          const userData = snapshot.val();
          const dropboxUserData = {
            account_id: userData.dropboxAPISCredentials.account_id,
            email: userData.dropboxAPISCredentials.email,
          };
          await userRef.update({
            dropboxAPISCredentials: {
              credentials: {
                ...userData.dropboxAPISCredentials.credentials,
                access_token: response.access_token,
              },
              ...dropboxUserData,
            },
          });
          return await this.dropboxUploadFile(req);
        }
      }
    });
  }

  async dropboxUploadFile(req): Promise<any> {
    const uid = req.user?.id;
    const userData = await this.getUserData(uid);

    if (userData && userData.dropboxAPISCredentials) {
      const { itemId, itemType, name, blob } = req.body;
      let resData;
      let ext;
      if (itemType == 'image') {
        resData = await this.imageService.getImageByIdPrivate(uid, itemId);
        ext = resData.dbData.refName;
      } else {
        resData = await this.videoService.getVideoByIdPrivate(uid, itemId);
        ext = resData.dbData.refName ? resData.dbData.refName : resData.url;
      }
      const db = admin.database();
      const collection = itemType === 'image' ? 'screenshots' : 'videos';
      const itemRef = db.ref(`/users/${uid}/${collection}/${itemId}`);

      return new Promise(async (res, rej) => {
        try {
          const token =
            userData.dropboxAPISCredentials.credentials.access_token;

          const dropbox = dropboxV2Api.authenticate({ token });
          const mediaBody = Readable.from(blob.buffer);

          await dropbox(
            {
              resource: 'files/upload',
              parameters: {
                path: `/${name}.${ext.split('.').pop()}`,
                mode: 'add',
                autorename: true,
                mute: false,
                strict_conflict: false,
              },
              readStream: mediaBody,
            },
            async (err, response) => {
              if (err) {
                console.log(err, 'err');
                if (err.error && err.error['.tag'] == 'expired_access_token') {
                  return await this.refreshToken(
                    userData.dropboxAPISCredentials.credentials.refresh_token,
                    req,
                  );
                }
                res({
                  status: ResStatusEnum.error,
                  message: 'Error while trying to upload file',
                  error: err,
                  data: null,
                });
              }
              if (response) {
                if (response && response.name && itemRef) {
                  await itemRef.update({
                    dropBoxData: {
                      id: response.id,
                      name: response.name,
                      rev: response.rev,
                      path_lower: response.path_lower,
                      email: userData.dropboxAPISCredentials.email,
                    },
                  });
                }
                res({
                  status: ResStatusEnum.success,
                  message: 'Success',
                  error: null,
                  data: response.name,
                });
              }
            },
          );
        } catch (e) {
          console.log(e, 'e 1');
          res({
            status: ResStatusEnum.error,
            message: 'Error while trying to upload item to dropbox',
            error: e,
            data: null,
          });
        }
      });
    } else {
      return {
        status: ResStatusEnum.error,
        message: 'Error while trying to upload file to dropbox',
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
      await userRef.update({ dropboxAPISCredentials: null });
    }

    await this.eventEmitter.emit('analytics.track', 'Dropbox Disconnected', {
      userId: uid,
    });

    return {
      status: ResStatusEnum.success,
      message: 'Success',
      error: null,
      data: null,
    };
  }

  async deleteFile(
    uid: string,
    itemId: string,
    itemType: string,
  ): Promise<IDataResponse> {
    const db = admin.database();
    const userRef = db.ref(`/users/${uid}`);
    const userSnap = await userRef.get();
    const userVal = userSnap.val();

    const collection = itemType === 'image' ? 'screenshots' : 'videos';
    const itemRef = db.ref(`/users/${uid}/${collection}/${itemId}`);
    const itemSnap = await itemRef.get();
    const item = itemSnap.val();

    if (item && item.dropBoxData && userVal) {
      const token = userVal.dropboxAPISCredentials.credentials.access_token;
      const dropbox = dropboxV2Api.authenticate({ token });
      await dropbox(
        {
          resource: 'files/delete_v2',
          parameters: {
            path: item.dropBoxData.path_lower,
            parent_rev: item.dropBoxData.rev,
          },
        },
        async (err, response) => {
          console.log(err, 'err');
          if (err) {
            return {
              status: ResStatusEnum.error,
              message: err.code || 'Error while trying to delete dropbox file.',
              error: null,
              data: null,
            };
          }
          if (response) {
            await itemRef.update({
              dropBoxData: null,
            });
            return {
              status: ResStatusEnum.success,
              message: 'Dropbox file successfully deleted.',
              error: null,
              data: response,
            };
          }
        },
      );
    }
    return {
      status: ResStatusEnum.success,
      message: 'Dropbox file successfully deleted.',
      error: null,
      data: null,
    };
  }
}
