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
import { OAuthStateService } from '../../services/shared/oauth-state.service';

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
    private readonly oauthStateService: OAuthStateService,
  ) {
    this.apiKey = this.configService.get<string>('DROPBOX_API_KEY');
    this.apiSecrete = this.configService.get<string>('DROPBOX_API_SECRET');
    this.baseURL = this.configService.get<string>('API_BASE_URL');
    this.redirectURI = `${this.baseURL}${this.redirectUriPath}`;
  }

  async generateAuthUrl(uid, binding: string): Promise<any> {
    const userData = await this.getUserData(uid);

    if (userData && userData.dropboxAPISCredentials) {
      return {
        status: ResStatusEnum.error,
        message:
          'You have already dropbox integrated. Please refresh the page and try again.',
      };
    } else {
      const dropbox = dropboxV2Api.authenticate({
        client_id: this.apiKey,
        client_secret: this.apiSecrete,
        redirect_uri: this.redirectURI,
        token_access_type: 'offline', // if you need an offline long-living refresh token
        state: await this.oauthStateService.issue(uid, 'dropbox', binding),
      });
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

  async completeOAuth(
    state: string,
    code: string,
    binding?: string,
  ): Promise<any> {
    // The state is a one-time value issued for a signed-in user to the browser that asked for it
    // (`binding`). Anything else: no exchange, no write.
    const uid = await this.oauthStateService.consume(state, 'dropbox', binding);
    if (!uid) {
      return null;
    }

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

  /**
   * Gets a new access token for the user's refresh token and saves it. Resolves with the new access
   * token; rejects when Dropbox refuses the refresh token or the token cannot be saved.
   */
  refreshToken(refresh_token, req): Promise<string> {
    const dropbox = dropboxV2Api.authenticate({
      client_id: this.apiKey,
      client_secret: this.apiSecrete,
      redirect_uri: this.redirectURI,
      token_access_type: 'offline',
    });
    return new Promise<string>((res, rej) => {
      // The client can call back twice when Dropbox refuses the refresh token: first with the
      // error, then with the error body. Only the first answer counts.
      let answered = false;
      dropbox.refreshToken(refresh_token, async (err, response) => {
        if (answered) {
          return;
        }
        answered = true;
        try {
          if (err || !response?.access_token) {
            console.log(err, 'err');
            throw err || new Error('Dropbox returned no access token');
          }
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
          res(response.access_token);
        } catch (e) {
          rej(e);
        }
      });
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

      // Access tokens are short-lived: when one has expired, refresh it once and retry the upload
      // once with the new token. Every attempt answers the request, whatever happens.
      const upload = (token: string, isRetry: boolean): Promise<any> =>
        new Promise(async (res) => {
          try {
            const dropbox = dropboxV2Api.authenticate({ token });
            // A stream can be read once, so each attempt sends the file from a new one.
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
                  if (
                    !isRetry &&
                    err.error &&
                    err.error['.tag'] == 'expired_access_token'
                  ) {
                    let newToken: string;
                    try {
                      newToken = await this.refreshToken(
                        userData.dropboxAPISCredentials.credentials
                          .refresh_token,
                        req,
                      );
                    } catch {
                      // refreshToken has logged why; the token endpoint's answer stays here.
                      return res({
                        status: ResStatusEnum.error,
                        message:
                          'Error while trying to refresh the Dropbox access token',
                        error: null,
                        data: null,
                      });
                    }
                    return res(await upload(newToken, true));
                  }
                  return res({
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

      return upload(
        userData.dropboxAPISCredentials.credentials.access_token,
        false,
      );
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

    if (!item || !item.dropBoxData) {
      return {
        status: ResStatusEnum.error,
        message: 'This item has no Dropbox file to delete.',
        error: null,
        data: null,
      };
    }

    const token = userVal?.dropboxAPISCredentials?.credentials?.access_token;
    if (!token) {
      return {
        status: ResStatusEnum.error,
        message: 'Dropbox is not connected.',
        error: null,
        data: null,
      };
    }

    const dropbox = dropboxV2Api.authenticate({ token });
    // Answer with what Dropbox did, and unlink the item only when the file is gone.
    return new Promise<IDataResponse>((res, rej) => {
      dropbox(
        {
          resource: 'files/delete_v2',
          parameters: {
            path: item.dropBoxData.path_lower,
            parent_rev: item.dropBoxData.rev,
          },
        },
        (err, response) => {
          if (err) {
            console.log(err, 'err');
            return res({
              status: ResStatusEnum.error,
              message: err.code || 'Error while trying to delete dropbox file.',
              error: null,
              data: null,
            });
          }
          itemRef
            .update({
              dropBoxData: null,
            })
            .then(
              () =>
                res({
                  status: ResStatusEnum.success,
                  message: 'Dropbox file successfully deleted.',
                  error: null,
                  data: response,
                }),
              rej,
            );
        },
      );
    });
  }
}
