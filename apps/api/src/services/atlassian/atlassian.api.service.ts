import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from 'nestjs-http-promise';
import { ResStatusEnum } from 'src/enums/ResStatusEnum';
import * as admin from 'firebase-admin';
import { Readable } from 'stream';
import fetch from 'node-fetch';
import FormData from 'form-data';

@Injectable()
export class AtlassianApiService {
  private clientId: string;
  private clientSecrete: string;
  private baseURL: string;
  private websiteUrl: string;
  private oauthRedirect: string;
  private redirectUriPath = '/api/v1/atlassian/jira/complete-oauth';
  private jiraRestApiUrl = 'https://api.atlassian.com/ex/jira';
  private jiraScope =
    'read:me write:jira-work read:jira-work manage:jira-project offline_access manage:jira-configuration read:jira-user manage:jira-webhook manage:jira-data-provider';
  private trelloRestApiUrl = 'https://api.trello.com/1';
  private restApi = 'rest/api/3';

  private trelloKey: string;
  private oauthTrelloRedirect: string;
  private redirectTrelloUriPath = '/media/integrations';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    this.clientId = this.configService.get<string>('JIRA_CLIENT_ID');
    this.clientSecrete = this.configService.get<string>('JIRA_CLIENT_SECRET');
    this.baseURL = this.configService.get<string>('API_BASE_URL');
    this.websiteUrl = this.configService.get<string>('WEBSITE_URL');
    this.oauthRedirect = `${this.baseURL}${this.redirectUriPath}`;

    this.oauthTrelloRedirect = `${this.websiteUrl}${this.redirectTrelloUriPath}`;
    this.trelloKey = this.configService.get<string>('TRELLO_KEY');
  }

  async getAccessibleResources(token: string) {
    try {
      const headersRequest = {
        Authorization: `Bearer ${token}`,
        Accept: `application/json`,
      };

      const { data = null } = await this.httpService.get<any, any>(
        `https://api.atlassian.com/oauth/token/accessible-resources`,
        {
          headers: headersRequest,
        }
      );

      if (data) {
        return {
          status: ResStatusEnum.success,
          message: null,
          data: data,
        };
      } else {
        return {
          status: ResStatusEnum.error,
          message: 'Something went wrong, Please try again later.',
          error: 'Something went wrong, Please try again later.',
          data: null,
        };
      }
    } catch (e) {
      console.log(e, 'ee');
      return {
        status: ResStatusEnum.error,
        message: 'Something went wrong, Please try again later.',
        error: 'Something went wrong, Please try again later.',
        data: null,
      };
    }
  }

  async getAccessToken(
    code: string,
    grant_type = 'authorization_code'
  ): Promise<any> {
    const body = {
      grant_type: grant_type,
      client_id: this.clientId,
      client_secret: this.clientSecrete,
      ...(grant_type == 'authorization_code'
        ? { code: code }
        : { refresh_token: code }),
      redirect_uri: this.oauthRedirect,
    };
    return await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })
      .then(async response => {
        return await response.json();
      })
      .then(res => {
        return {
          status: ResStatusEnum.success,
          data: res,
          error: null,
          message: null,
        };
      })
      .catch(err => {
        return {
          status: ResStatusEnum.error,
          message: 'Something went wrong, Please try again later.',
          error: 'Something went wrong, Please try again later.',
          data: null,
        };
      });
  }

  async generateTrelloOauthLink(uid: string) {
    return `https://trello.com/1/authorize?expiration=never&name=Rec&scope=read,write,account&response_type=fragment&key=${this.trelloKey}&callback_method=fragment&return_url=${this.oauthTrelloRedirect}`;
  }

  async generateOauthLink(uid: string) {
    const url = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${this.clientId}&scope=${this.jiraScope}&redirect_uri=${this.oauthRedirect}&state=${uid}&response_type=code&prompt=consent`;
    return encodeURI(url);
  }

  async attachmentsIssue(
    resourceId: string,
    credentials: any,
    method: string,
    formData: any
  ) {
    const { access_token = null } = credentials;
    const API_URL = `${this.jiraRestApiUrl}/${resourceId}/${this.restApi}/${method}`;
    fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'X-Atlassian-Token': 'no-check',
      },
      body: formData,
    }).catch(err => {
      console.error(err, 'Jira Attachment Errors');
    });
  }

  async createIssue(
    resourceId: string,
    credentials: any,
    method: string,
    bodyData: any
  ) {
    const { access_token = null } = credentials;

    const API_URL = `${this.jiraRestApiUrl}/${resourceId}/${this.restApi}/${method}`;

    return await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: bodyData,
    })
      .then(async response => {
        return await response.json();
      })
      .then(res => {
        return {
          status: ResStatusEnum.success,
          data: res,
        };
      })
      .catch(err => {
        console.log(err, 'create issue err');
        return {
          status: ResStatusEnum.error,
          message: 'Something went wrong, Please try again later.',
          error: 'Something went wrong, Please try again later.',
          data: null,
        };
      });
  }

  public async getUserData(uid: string) {
    const db = admin.database();
    const userRef = db.ref(`users/${uid}`);
    const snapshot = await userRef.get();
    const userData = snapshot.val();
    return userData;
  }

  public async refreshToken(uid: string, credentials: any) {
    const { refresh_token = null } = credentials;
    const refreshTokenData = await this.getAccessToken(
      refresh_token,
      'refresh_token'
    );
    if (
      refreshTokenData.status == ResStatusEnum.success &&
      refreshTokenData.data &&
      !refreshTokenData.data.error
    ) {
      const db = admin.database();
      const userRef = db.ref(`users//${uid}`);
      const userSnap = await userRef.get();
      const userVal = userSnap.val();

      const jiraUserData = {
        email: userVal.jiraAPISCredentials.email,
        account_id: userVal.jiraAPISCredentials.account_id,
        picture: userVal.jiraAPISCredentials.picture,
      };

      await userRef.update({
        jiraAPISCredentials: {
          credentials: {
            access_token: refreshTokenData.data.access_token,
            refresh_token: refreshTokenData.data.refresh_token,
          },
          ...jiraUserData,
        },
      });
      return {
        status: ResStatusEnum.success,
        data: userVal,
        message: null,
        error: null,
      };
    } else {
      return {
        status: ResStatusEnum.error,
        message: null,
        error: 'Something went wrong, Please try again later.',
        data: null,
      };
    }
  }

  async manageResponseFromJira(res: any): Promise<any> {
    if (res && res.data && res.data.error) {
      return {
        status: ResStatusEnum.error,
        message: null,
        error: 'Something went wrong, Please try again later.',
        data: null,
      };
    }
    return {
      status: ResStatusEnum.success,
      error: null,
      data: res,
      message: null,
    };
  }

  async getDataFromRestAPI(
    projectsId: string,
    credentials: any,
    method: string
  ): Promise<any> {
    const { access_token = null } = credentials;
    if (access_token) {
      const API_URL = `${this.jiraRestApiUrl}/${projectsId}/${this.restApi}/${method}`;
      return await fetch(API_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })
        .then(response => {
          return response.json();
        })
        .catch(err => {
          console.log(err, 'err');
          return null;
        });
    } else {
      return null;
    }
  }

  async checkTokenExpiration(uid: string, credentials: any): Promise<any> {
    const { access_token } = credentials;
    if (access_token) {
      const res = await this.getJiraUserDetails(access_token);
      if (
        res &&
        res.data &&
        res.data.message &&
        res.data.message == 'Unauthorized'
      ) {
        const resRefreshToken = await this.refreshToken(uid, credentials);
        if (resRefreshToken.status == ResStatusEnum.success) {
          return true;
        }
      }
      if (res && res.data && res.data.account_id) {
        return true;
      }
      return false;
    } else {
      return false;
    }
  }

  async getJiraUserDetails(token: string) {
    const API_URL = `https://api.atlassian.com/me`;
    return await fetch(API_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then(response => {
        return response.json();
      })
      .then(async res => {
        return {
          status: ResStatusEnum.success,
          data: res,
          message: null,
          error: null,
        };
      })
      .catch(err => {
        return {
          status: ResStatusEnum.error,
          message: 'Something went wrong, Please try again later.',
          error: 'Something went wrong, Please try again later.',
          data: null,
        };
      });
  }

  async getTrelloMemberDetails(token: string) {
    const API_URL = `${this.trelloRestApiUrl}/members/me?key=${this.trelloKey}&token=${token}`;

    return await fetch(API_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then(response => {
        return response.json();
      })
      .catch(err => {
        return false;
      });
  }

  async getTrelloBoards(token: string) {
    const API_URL = `${this.trelloRestApiUrl}/members/me/boards?fields=name,url&key=${this.trelloKey}&token=${token}`;
    return await fetch(API_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then(response => {
        return response.json();
      })
      .catch(err => {
        console.log(err, 'err');
        return [];
      });
  }

  async getTrelloBoardsLists(token: string, boardId: string) {
    const API_URL = `${this.trelloRestApiUrl}/boards/${boardId}/lists?key=${this.trelloKey}&token=${token}`;
    return await fetch(API_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then(response => {
        return response.json();
      })
      .catch(err => {
        console.log(err, 'err');
        return [];
      });
  }

  async createTrelloCard(token: string, boardId: string, bodyData: any) {
    const API_URL = `${this.trelloRestApiUrl}/cards?idList=${boardId}&key=${this.trelloKey}&token=${token}`;
    return await fetch(API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json;charset=UTF-8',
      },
      body: JSON.stringify(bodyData),
    })
      .then(response => {
        return response.json();
      })
      .then(async res => {
        console.log(res, 'res card trello');
        return {
          status: ResStatusEnum.success,
          data: res,
          message: 'Trello Card created successfully.',
          error: null,
        };
      })
      .catch(err => {
        console.log(err, 'err');
        return {
          status: ResStatusEnum.error,
          message: null,
          error: 'Something went wrong, Please try again later.',
          data: null,
        };
      });
  }

  async trelloAttachmentsIssue(token: string, cardId: string, formData: any) {
    const API_URL = `${this.trelloRestApiUrl}/cards/${cardId}/attachments?key=${this.trelloKey}&token=${token}`;
    await fetch(API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
      },
      body: formData,
    })
      .then(response => {
        return response.json();
      })
      .then(async res => {
        console.log(res, 'res trello attachment');
        return {
          status: ResStatusEnum.success,
          data: res,
          message: null,
          error: null,
        };
      })
      .catch(err => {
        console.log(err, 'err attach issue');
        return {
          status: ResStatusEnum.error,
          message: null,
          error: 'Something went wrong, Please try again later.',
          data: null,
        };
      });
  }
}
