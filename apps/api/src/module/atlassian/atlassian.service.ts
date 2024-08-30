import { Injectable } from '@nestjs/common';
import { ResStatusEnum } from '../../enums/ResStatusEnum';
import * as admin from 'firebase-admin';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ImageService } from '../image/image.service';
import { VideoService } from '../video/video.service';
import { AtlassianApiService } from 'src/services/atlassian/atlassian.api.service';
import { Readable } from 'stream';
import { ConfigService } from '@nestjs/config';
const FormData = require('form-data');
const getRawBody = require('raw-body');
const fetch = require('node-fetch');

@Injectable()
export class AtlassianService {
  constructor(
    private eventEmitter: EventEmitter2,
    private readonly imageService: ImageService,
    private readonly videoService: VideoService,
    private readonly atlassianApiService: AtlassianApiService,
    private readonly configService: ConfigService
  ) {}

  async createJiraIssue(req): Promise<any> {
    const uid = req.user?.id;
    const userVal = await this.getUserData(uid);
    const res = await this.atlassianApiService.checkTokenExpiration(
      uid,
      userVal.jiraAPISCredentials.credentials
    );

    if (res) {
      const userData = await this.getUserData(uid);
      const {
        itemId,
        itemType,
        projectId,
        issueType,
        resourceId,
        description = '',
        title = '',
      } = req.body;
      let resData;

      if (itemType == 'image') {
        resData = await this.imageService.getImageByIdPrivate(uid, itemId);
      } else {
        resData = await this.videoService.getVideoByIdPrivate(uid, itemId);
      }

      const bodyData = `{
            "update": {},
            "fields": {
              "summary": "${title}",
              "issuetype": {
                "id": "${issueType}"
              },
              "project": {
                "id": "${projectId}"
              },
              "description": {
                "type": "doc",
                "version": 1,
                "content": [
                  {
                    "type": "paragraph",
                    "content": [
                      {
                        "text": "${description}",
                        "type": "text"
                      }
                    ]
                  }
                ]
              }
            }
      }`;

      const issueResponse = await this.atlassianApiService.createIssue(
        resourceId,
        userData.jiraAPISCredentials.credentials,
        'issue',
        bodyData
      );
      if (
        issueResponse &&
        issueResponse.status == ResStatusEnum.success &&
        issueResponse.data &&
        issueResponse.data.key
      ) {
        const fileStream = await this.getStreamFromFile(resData, itemType);
        if (fileStream && fileStream.buffer) {
          const formData = new FormData();
          formData.append('file', fileStream.buffer, {
            knownLength: fileStream.size,
            filename: fileStream.name,
          });
          this.atlassianApiService.attachmentsIssue(
            resourceId,
            userData.jiraAPISCredentials.credentials,
            `issue/${issueResponse.data.key}/attachments`,
            formData
          );
        }
        return {
          status: ResStatusEnum.success,
          message: 'Jira issue created successfully.',
          error: null,
          data: issueResponse?.data,
        };
      } else if (
        issueResponse &&
        issueResponse.data &&
        issueResponse.data.errors
      ) {
        return {
          status: ResStatusEnum.error,
          message:
            issueResponse.data.errors?.issuetype ||
            'Something went wrong, Please try again later.',
          error: null,
          data: null,
        };
      } else {
        return {
          status: ResStatusEnum.error,
          message: 'Something went wrong, Please try again later.',
          error: null,
          data: null,
        };
      }
    } else {
      return {
        status: ResStatusEnum.error,
        message: 'Something went wrong, Please try again later.',
        error: null,
        data: null,
      };
    }
  }

  async mapAsync(arr, callback) {
    const fail = Symbol();
    return (
      await Promise.all(
        arr.map(async item => ((await callback(item)) ? item : fail))
      )
    ).filter(i => i !== fail);
  }

  async generateJiraAuthUrl(uid): Promise<any> {
    const userData = await this.getUserData(uid);
    if (userData && userData.jiraAPISCredentials) {
      return {
        status: ResStatusEnum.error,
        message:
          'You have already Jira integrated. Please refresh the page and try again.',
      };
    } else {
      return this.atlassianApiService.generateOauthLink(uid);
    }
  }

  async completeJiraOAuth(uid: string, code: string): Promise<any> {
    const res: any = await this.atlassianApiService.getAccessToken(code);
    if (res && res.status && res.status == ResStatusEnum.success && res.data) {
      const access_token = res.data.access_token;
      const refresh_token = res.data.refresh_token;

      if (access_token) {
        const jiraMemberDetails =
          await this.atlassianApiService.getJiraUserDetails(access_token);
        if (
          jiraMemberDetails &&
          jiraMemberDetails.status == ResStatusEnum.success
        ) {
          const db = admin.database();
          const userRef = db.ref(`/users/${uid}`);

          const jiraUserData = {
            email: jiraMemberDetails?.data?.email,
            account_id: jiraMemberDetails?.data?.account_id,
            picture: jiraMemberDetails?.data?.picture,
          };
          await userRef.update({
            jiraAPISCredentials: {
              credentials: {
                access_token,
                refresh_token,
              },
              ...jiraUserData,
            },
          });
          return true;
        } else {
          return 'Something went wrong, Please try again later.';
        }
      }
    } else {
      console.log(res, 'res error ');
      return 'Something went wrong, Please try again later.';
    }
  }

  async signOutJira(uid: string) {
    const db = admin.database();
    const userRef = db.ref(`users//${uid}`);
    const userSnap = await userRef.get();
    const userData = userSnap.val();

    if (userData) {
      await userRef.update({ jiraAPISCredentials: null });
    }

    await this.eventEmitter.emit('analytics.track', 'Jira Disconnected', {
      userId: uid,
    });

    return {
      status: ResStatusEnum.success,
      message: 'Success',
      error: null,
      data: null,
    };
  }

  async getJiraProjectsData(uid): Promise<any> {
    const userVal = await this.getUserData(uid);
    const res = await this.atlassianApiService.checkTokenExpiration(
      uid,
      userVal.jiraAPISCredentials.credentials
    );
    if (res) {
      const userData = await this.getUserData(uid);
      const resourcesData: any[] = [];
      const resources = await this.atlassianApiService.getAccessibleResources(
        userData.jiraAPISCredentials.credentials.access_token
      );
      if (resources && resources.data && resources.data.length > 0) {
        await this.mapAsync(resources.data, async (item, index) => {
          const object = {
            ...item,
            projects: [],
          };
          const projects = await this.atlassianApiService.getDataFromRestAPI(
            item.id,
            userData.jiraAPISCredentials.credentials,
            'project'
          );
          const projectsData: any[] = [];
          if (projects && projects.length > 0) {
            await this.mapAsync(projects, async (element, index) => {
              const issueTypes =
                await this.atlassianApiService.getDataFromRestAPI(
                  item.id,
                  userData.jiraAPISCredentials.credentials,
                  'issuetype/project?projectId=' + element.id
                );
              projectsData.push({
                ...element,
                issueTypes: issueTypes ? issueTypes : [],
              });
            });
          }
          if (projects) {
            object.projects = projectsData;
          }
          resourcesData.push(object);
        });
      }
      return {
        status: ResStatusEnum.success,
        message: null,
        error: null,
        data: resourcesData,
      };
    } else {
      return {
        status: ResStatusEnum.error,
        message: 'Something went wrong, Please try again later.',
        error: null,
        data: null,
      };
    }
  }

  async generateTrelloAuthUrl(uid): Promise<any> {
    const userData = await this.getUserData(uid);
    if (userData && userData.trelloAPISCredentials) {
      return {
        status: ResStatusEnum.error,
        message:
          'You have already Trello integrated. Please refresh the page and try again.',
      };
    } else {
      return this.atlassianApiService.generateTrelloOauthLink(uid);
    }
  }

  public async getUserData(uid: string) {
    const db = admin.database();
    const userRef = db.ref(`users/${uid}`);
    const snapshot = await userRef.get();
    const userData = snapshot.val();
    return userData;
  }

  async completeTrelloOAuth(uid: string, req: any): Promise<any> {
    const membersDetails =
      await this.atlassianApiService.getTrelloMemberDetails(req.token);
    if (membersDetails && membersDetails.id) {
      const db = admin.database();
      const userRef = db.ref(`/users/${uid}`);
      const trelloUserData = {
        id: membersDetails?.id,
        email: membersDetails?.email,
        url: membersDetails?.url,
      };
      await userRef.update({
        trelloAPISCredentials: {
          credentials: {
            access_token: req.token,
          },
          ...trelloUserData,
        },
      });
      return {
        status: ResStatusEnum.success,
        message: 'Success',
        error: null,
        data: membersDetails,
      };
    } else {
      return {
        status: ResStatusEnum.error,
        message: 'Something went wrong, Please try again later.',
        error: null,
        data: null,
      };
    }
  }

  async getTrelloProjectsData(uid): Promise<any> {
    const userVal = await this.getUserData(uid);
    if (userVal.trelloAPISCredentials.credentials) {
      let boards: any[] = [];
      const boardsData: any[] = [];

      boards = await this.atlassianApiService.getTrelloBoards(
        userVal.trelloAPISCredentials.credentials.access_token
      );
      if (boards && boards.length > 0) {
        await this.mapAsync(boards, async (item, index) => {
          const lists = await this.atlassianApiService.getTrelloBoardsLists(
            userVal.trelloAPISCredentials.credentials.access_token,
            item.id
          );
          const object = {
            ...item,
            list: lists,
          };
          boardsData.push(object);
        });
      }
      const responseData = {
        boards: boardsData,
      };
      return {
        status: ResStatusEnum.success,
        message: null,
        error: null,
        data: responseData,
      };
    }
  }

  async signOutTrelloUser(uid: string) {
    const db = admin.database();
    const userRef = db.ref(`users//${uid}`);
    const userSnap = await userRef.get();
    const userData = userSnap.val();

    if (userData) {
      await userRef.update({ trelloAPISCredentials: null });
    }

    await this.eventEmitter.emit('analytics.track', 'Trello Disconnected', {
      userId: uid,
    });

    return {
      status: ResStatusEnum.success,
      message: 'Success',
      error: null,
      data: null,
    };
  }

  async getStreamFromFile(res, type = 'image') {
    const collection = type === 'image' ? 'screenshots' : 'videos';
    const userVal = res.dbData;
    const bucket = admin.storage().bucket();
    const streamData = userVal?.streamData;

    if (!streamData) {
      const readableStream = await bucket.file(
        `users/${userVal.uid}/${collection}/${res.dbData.refName}`
      );
      const metadata = (await readableStream.getMetadata())[0];
      const buffer = await getRawBody(readableStream.createReadStream());
      return { buffer, size: metadata.size, name: metadata.name };
    } else {
      const steamResponse = await fetch(streamData.downloadUrl)
        .then(res => res.buffer())
        .then(buffer => {
          return buffer;
        })
        .catch(err => {
          console.log(err, 'stream error');
          return false;
        });
      if (steamResponse) {
        return {
          buffer: steamResponse,
          size: steamResponse.byteLength,
          name: new Date().getTime() + '.mp4',
        };
      }
    }
    return false;
  }

  async createTrelloCard(uid: string, req: any): Promise<any> {
    const userVal = await this.getUserData(uid);
    const {
      itemId,
      itemType,
      projectId,
      issueType,
      description = '',
      title = '',
    } = req.body;

    if (userVal.trelloAPISCredentials.credentials) {
      let sharedLink = '';
      let resData;
      if (itemType == 'image') {
        resData = await this.imageService.getImageByIdPrivate(uid, itemId);

        if (resData.sharedLink) {
          sharedLink = `${this.configService.get<string>(
            'WEBSITE_URL'
          )}/image/shared/${resData.sharedLink}`;
        } else {
          const sharedCode = await this.imageService.share(uid, itemId);
          sharedLink = `${this.configService.get<string>(
            'WEBSITE_URL'
          )}/image/shared/${sharedCode}`;
        }
      } else {
        resData = await this.videoService.getVideoByIdPrivate(uid, itemId);
        if (resData.sharedLink) {
          sharedLink = `${this.configService.get<string>(
            'WEBSITE_URL'
          )}/video/shared/${resData.sharedLink}`;
        } else {
          const sharedCode = await this.videoService.share(uid, itemId);
          sharedLink = `${this.configService.get<string>(
            'WEBSITE_URL'
          )}/video/shared/${sharedCode}`;
        }
      }

      const body: any = {
        name: title,
        idList: issueType,
        cardCovers: false,
        desc: description,
      };
      const fileStream = await this.getStreamFromFile(resData, itemType);
      let isAttachment = false;
      if (fileStream && Number(fileStream.size) > 10276044) {
        body.urlSource = sharedLink;
      } else {
        isAttachment = true;
      }

      const trelloResponse = await this.atlassianApiService.createTrelloCard(
        userVal.trelloAPISCredentials.credentials.access_token,
        projectId,
        body
      );
      if (
        trelloResponse &&
        trelloResponse.status == ResStatusEnum.success &&
        trelloResponse.data &&
        trelloResponse.data.id
      ) {
        if (isAttachment) {
          if (fileStream && fileStream.buffer) {
            const formData = new FormData();
            formData.append('setCover', '0');
            formData.append('file', fileStream.buffer, {
              knownLength: fileStream.size,
              filename: fileStream.name,
            });
            this.atlassianApiService.trelloAttachmentsIssue(
              userVal.trelloAPISCredentials.credentials.access_token,
              trelloResponse.data.id,
              formData
            );
          }
        }
        return {
          status: ResStatusEnum.success,
          message: 'Trello card created successfully.',
          error: null,
          data: trelloResponse.data,
        };
      } else {
        return {
          status: ResStatusEnum.error,
          message: 'Something went wrong, Please try again later.',
          error: null,
          data: null,
        };
      }
    } else {
      return {
        status: ResStatusEnum.error,
        message: 'Something went wrong, Please try again later.',
        error: null,
        data: null,
      };
    }
  }
}
