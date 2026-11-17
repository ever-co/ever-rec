import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from 'nestjs-http-promise';
import { ResStatusEnum } from 'src/enums/ResStatusEnum';
import * as admin from 'firebase-admin';
import { Readable } from 'stream';
import { OAuthStateService } from '../shared/oauth-state.service';
const fetch = require('node-fetch');
const FormData = require('form-data');

/**
 * Logs a failed Trello or Jira call with a fixed message and only the error code or HTTP status.
 * The error itself is never logged: node-fetch errors carry the request URL in their message and
 * axios errors carry the request headers, so either can hold the user's token.
 */
function logIntegrationFailure(call: string, err: any, httpStatus?: number) {
  const code =
    typeof err?.code === 'string' && /^[A-Z][A-Z0-9_]*$/.test(err.code)
      ? err.code
      : undefined;
  const status =
    httpStatus ??
    (typeof err?.response?.status === 'number'
      ? err.response.status
      : undefined);
  console.error(`${call} failed`, { code, status });
}

@Injectable()
export class AtlassianApiService {
  private clientId: string;
  private clientSecrete: string;
  private baseURL: string;
  private websiteUrl: string;
  private oauthRedirect: string;
  private redirectUriPath: string = '/api/v1/atlassian/jira/complete-oauth';
  private jiraRestApiUrl: string = 'https://api.atlassian.com/ex/jira';
  private jiraScope: string =
    'read:me write:jira-work read:jira-work manage:jira-project offline_access manage:jira-configuration read:jira-user manage:jira-webhook manage:jira-data-provider';
  private trelloRestApiUrl: string = 'https://api.trello.com/1';
  private restApi: string = 'rest/api/3';

  private trelloKey: string;
  private oauthTrelloRedirect: string;
  private redirectTrelloUriPath: string = '/media/integrations';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly oauthStateService: OAuthStateService,
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
        },
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
      logIntegrationFailure('Jira accessible-resources request', e);
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
    grant_type = 'authorization_code',
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
      .then(async (response) => {
        return await response.json();
      })
      .then((res) => {
        return {
          status: ResStatusEnum.success,
          data: res,
          error: null,
          message: null,
        };
      })
      .catch((err) => {
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

  async generateOauthLink(uid: string, binding: string) {
    const state = await this.oauthStateService.issue(uid, 'jira', binding);
    const url = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${this.clientId}&scope=${this.jiraScope}&redirect_uri=${this.oauthRedirect}&state=${state}&response_type=code&prompt=consent`;
    return encodeURI(url);
  }

  async attachmentsIssue(
    resourceId: string,
    credentials: any,
    method: string,
    formData: any,
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
    }).catch((err) => {
      logIntegrationFailure('Jira attachment upload', err);
    });
  }

  async createIssue(
    resourceId: string,
    credentials: any,
    method: string,
    bodyData: any,
  ) {
    const { access_token = null } = credentials;

    const API_URL = `${this.jiraRestApiUrl}/${resourceId}/${this.restApi}/${method}`;

    let httpStatus: number | undefined;
    return await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: bodyData,
    })
      .then(async (response) => {
        httpStatus = response.status;
        return await response.json();
      })
      .then((res) => {
        return {
          status: ResStatusEnum.success,
          data: res,
        };
      })
      .catch((err) => {
        logIntegrationFailure('Jira create issue', err, httpStatus);
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
      'refresh_token',
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
    method: string,
  ): Promise<any> {
    const { access_token = null } = credentials;
    if (access_token) {
      const API_URL = `${this.jiraRestApiUrl}/${projectsId}/${this.restApi}/${method}`;
      let httpStatus: number | undefined;
      return await fetch(API_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => {
          httpStatus = response.status;
          return response.json();
        })
        .catch((err) => {
          logIntegrationFailure('Jira REST request', err, httpStatus);
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
      .then((response) => {
        return response.json();
      })
      .then(async (res) => {
        return {
          status: ResStatusEnum.success,
          data: res,
          message: null,
          error: null,
        };
      })
      .catch((err) => {
        return {
          status: ResStatusEnum.error,
          message: 'Something went wrong, Please try again later.',
          error: 'Something went wrong, Please try again later.',
          data: null,
        };
      });
  }

  /** Trello's OAuth header, so the long-lived token never appears in a URL. */
  private trelloAuthorization(token: string): string {
    return `OAuth oauth_consumer_key="${this.trelloKey}", oauth_token="${token}"`;
  }

  async getTrelloMemberDetails(token: string) {
    const API_URL = `${this.trelloRestApiUrl}/members/me`;

    return await fetch(API_URL, {
      method: 'GET',
      headers: {
        Authorization: this.trelloAuthorization(token),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then((response) => {
        return response.json();
      })
      .catch((err) => {
        return false;
      });
  }

  async getTrelloBoards(token: string) {
    const API_URL = `${this.trelloRestApiUrl}/members/me/boards?fields=name,url`;
    let httpStatus: number | undefined;
    return await fetch(API_URL, {
      method: 'GET',
      headers: {
        Authorization: this.trelloAuthorization(token),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then((response) => {
        httpStatus = response.status;
        return response.json();
      })
      .catch((err) => {
        logIntegrationFailure('Trello boards request', err, httpStatus);
        return [];
      });
  }

  async getTrelloBoardsLists(token: string, boardId: string) {
    const API_URL = `${this.trelloRestApiUrl}/boards/${encodeURIComponent(boardId)}/lists`;
    let httpStatus: number | undefined;
    return await fetch(API_URL, {
      method: 'GET',
      headers: {
        Authorization: this.trelloAuthorization(token),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then((response) => {
        httpStatus = response.status;
        return response.json();
      })
      .catch((err) => {
        logIntegrationFailure('Trello board lists request', err, httpStatus);
        return [];
      });
  }

  async createTrelloCard(token: string, boardId: string, bodyData: any) {
    const API_URL = `${this.trelloRestApiUrl}/cards?idList=${encodeURIComponent(boardId)}`;
    let httpStatus: number | undefined;
    return await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: this.trelloAuthorization(token),
        accept: 'application/json',
        'content-type': 'application/json;charset=UTF-8',
      },
      body: JSON.stringify(bodyData),
    })
      .then((response) => {
        httpStatus = response.status;
        return response.json();
      })
      .then(async (res) => {
        console.log(res, 'res card trello');
        return {
          status: ResStatusEnum.success,
          data: res,
          message: 'Trello Card created successfully.',
          error: null,
        };
      })
      .catch((err) => {
        logIntegrationFailure('Trello create card', err, httpStatus);
        return {
          status: ResStatusEnum.error,
          message: null,
          error: 'Something went wrong, Please try again later.',
          data: null,
        };
      });
  }

  async trelloAttachmentsIssue(token: string, cardId: string, formData: any) {
    const API_URL = `${this.trelloRestApiUrl}/cards/${encodeURIComponent(cardId)}/attachments`;
    let httpStatus: number | undefined;
    await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: this.trelloAuthorization(token),
        accept: 'application/json',
      },
      body: formData,
    })
      .then((response) => {
        httpStatus = response.status;
        return response.json();
      })
      .then(async (res) => {
        console.log(res, 'res trello attachment');
        return {
          status: ResStatusEnum.success,
          data: res,
          message: null,
          error: null,
        };
      })
      .catch((err) => {
        logIntegrationFailure('Trello card attachment', err, httpStatus);
        return {
          status: ResStatusEnum.error,
          message: null,
          error: 'Something went wrong, Please try again later.',
          data: null,
        };
      });
  }
}
