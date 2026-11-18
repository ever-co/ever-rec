import { Injectable } from '@nestjs/common';
import { ResStatusEnum } from '../../enums/ResStatusEnum';
import * as admin from 'firebase-admin';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from 'axios';
import dropboxV2Api from 'dropbox-v2-api';
import { ImageService } from '../image/image.service';
import { ConfigService } from '@nestjs/config';
import { VideoService } from '../video/video.service';
import { Readable } from 'stream';
import { IDataResponse } from 'src/interfaces/_types';
import { OAuthStateService } from '../../services/shared/oauth-state.service';

/** Dropbox's OAuth 2 token endpoint, the one the dropbox-v2-api client posts to. */
const DROPBOX_TOKEN_URL = 'https://api.dropboxapi.com/1/oauth2/token';

/** The parts of a token answer the service reads. */
interface DropboxToken {
  access_token: string;
  refresh_token?: string;
  account_id?: string;
}

/**
 * Posts a form to Dropbox's token endpoint and resolves with the answer. Rejects when the request
 * fails (a DNS failure, a reset connection), when Dropbox answers with a non-2xx status or when the
 * answer has no access token. The dropbox-v2-api client's getToken and refreshToken are not used:
 * they read the body of a request that got no answer, so a network error threw in a callback that
 * nothing catches and ended the process.
 */
async function requestDropboxToken(
  form: Record<string, string>,
): Promise<DropboxToken> {
  let data: any;
  try {
    ({ data } = await axios.post(
      DROPBOX_TOKEN_URL,
      // Like the client's form, a field with no value is left out.
      new URLSearchParams(
        Object.entries(form).filter(([, value]) => value != null),
      ),
      // The client did not follow a redirect of the POST, which carries the app secret.
      { maxRedirects: 0 },
    ));
  } catch (e) {
    // An axios error carries the request, whose form holds the app secret and the user's code or
    // refresh token: keep only the HTTP status or the error code.
    const reason =
      e?.response?.status ??
      (typeof e?.code === 'string' ? e.code : 'no answer');
    throw new Error(`Dropbox token request failed (${reason})`);
  }
  if (!data?.access_token) {
    throw new Error('Dropbox returned no access token');
  }
  return data;
}

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

    const db = admin.database();
    const userRef = db.ref(`/users/${uid}`);

    let result: DropboxToken;
    try {
      result = await requestDropboxToken({
        code,
        client_id: this.apiKey,
        client_secret: this.apiSecrete,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectURI,
      });
    } catch (e) {
      console.log(e.message, 'err');
      return Promise.reject('Error retrieving access token');
    }

    return new Promise((res, rej) => {
      try {
        const userDropbox = dropboxV2Api.authenticate({
          token: result.access_token,
        });

        userDropbox(
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
      } catch (e) {
        rej({
          status: ResStatusEnum.error,
          message: 'Error while trying to sign in with dropbox',
          error: e,
          data: null,
        });
      }
    });
  }

  /**
   * Gets a new access token for the user's refresh token and saves it. Resolves with the new access
   * token; rejects when the token request fails or gets no access token (a network error, a non-2xx
   * answer such as a refused refresh token) or when the token cannot be saved.
   */
  async refreshToken(refresh_token, req): Promise<string> {
    let response: DropboxToken;
    try {
      response = await requestDropboxToken({
        refresh_token,
        client_id: this.apiKey,
        client_secret: this.apiSecrete,
        grant_type: 'refresh_token',
      });
    } catch (e) {
      console.log(e.message, 'err');
      throw e;
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
    return response.access_token;
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
        new Promise((res) => {
          try {
            const dropbox = dropboxV2Api.authenticate({ token });
            // A stream can be read once, so each attempt sends the file from a new one.
            const mediaBody = Readable.from(blob.buffer);

            dropbox(
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
                    err.error?.['.tag'] === 'expired_access_token'
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
                    try {
                      await itemRef.update({
                        dropBoxData: {
                          id: response.id,
                          name: response.name,
                          rev: response.rev,
                          path_lower: response.path_lower,
                          email: userData.dropboxAPISCredentials.email,
                        },
                      });
                    } catch (e) {
                      // Nothing awaits this callback: a failed write must still answer the request.
                      console.log(e, 'e 2');
                      return res({
                        status: ResStatusEnum.error,
                        message:
                          'The file was saved to Dropbox, but the link to it could not be stored',
                        error: null,
                        data: null,
                      });
                    }
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

    if (!item?.dropBoxData) {
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

    const unlink = (data: unknown): Promise<IDataResponse> =>
      itemRef.update({ dropBoxData: null }).then(() => ({
        status: ResStatusEnum.success,
        message: 'Dropbox file successfully deleted.',
        error: null,
        data,
      }));

    // True only when Dropbox says the item's path holds nothing now; any other answer means "still there".
    const isGone = (accessToken: string): Promise<boolean> =>
      new Promise<boolean>((res) => {
        const dropbox = dropboxV2Api.authenticate({ token: accessToken });
        dropbox(
          {
            resource: 'files/get_metadata',
            parameters: { path: item.dropBoxData.path_lower },
          },
          (err) =>
            res(
              err?.error?.['.tag'] === 'path' &&
                err.error.path?.['.tag'] === 'not_found',
            ),
        );
      });

    // Answer with what Dropbox did, and unlink the item only when the file is gone. Access tokens are
    // short-lived: when one has expired, refresh it once and try once more, as the upload does.
    const remove = (
      accessToken: string,
      isRetry: boolean,
    ): Promise<IDataResponse> =>
      new Promise<IDataResponse>((res, rej) => {
        const dropbox = dropboxV2Api.authenticate({ token: accessToken });
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
              if (!isRetry && err.error?.['.tag'] === 'expired_access_token') {
                return this.refreshToken(
                  userVal.dropboxAPISCredentials.credentials.refresh_token,
                  { user: { id: uid } },
                )
                  .then(
                    (newToken) => remove(newToken, true),
                    // refreshToken has logged why; the token endpoint's answer stays here.
                    (): IDataResponse => ({
                      status: ResStatusEnum.error,
                      message:
                        'Error while trying to refresh the Dropbox access token',
                      error: null,
                      data: null,
                    }),
                  )
                  .then(res, rej);
              }
              // The page shows the message in a toast, so it must be words, not a status code.
              const failed: IDataResponse = {
                status: ResStatusEnum.error,
                message: 'Error while trying to delete the Dropbox file.',
                error: err.error_summary || err.code || null,
                data: null,
              };
              // not_found is about the stored path and revision (`parent_rev`). Unlink only when the path
              // holds nothing at all, as when the user deleted the file in Dropbox itself.
              if (
                err.error?.['.tag'] === 'path_lookup' &&
                err.error.path_lookup?.['.tag'] === 'not_found'
              ) {
                return isGone(accessToken)
                  .then((gone) => (gone ? unlink(null) : failed))
                  .then(res, rej);
              }
              return res(failed);
            }
            unlink(response).then(res, rej);
          },
        );
      });

    return remove(token, false);
  }
}
