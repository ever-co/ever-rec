/**
 * Failed Trello and Jira calls must not write the user's tokens to the logs. Trello tokens are
 * long-lived (expiration=never), so they go in the Authorization header, never in the URL: node-fetch
 * puts the full URL in its error messages ('request to <url> failed', 'invalid json response body
 * at <url>'), and Trello answers errors in plain text, so json() throws on any 4xx. A failed call
 * logs a fixed message with the error code or HTTP status only, never the error, its message or the
 * URL. node-fetch and the HTTP client are mocked, so nothing leaves the process.
 */
import { inspect } from 'util';
import { AtlassianApiService } from './atlassian.api.service';

const mockFetch = jest.fn();
jest.mock(
  'node-fetch',
  () =>
    (...args: any[]) =>
      mockFetch(...args),
);
jest.mock('firebase-admin', () => ({ database: jest.fn() }));

const trelloKey = 'trello-app-key-123';
const trelloToken = 'trello-user-token-abcdef0123456789';
const jiraToken = 'secret';

type TrelloCall = {
  name: string;
  run: (service: AtlassianApiService) => Promise<unknown>;
};

const trelloCalls: TrelloCall[] = [
  {
    name: 'getTrelloMemberDetails',
    run: (service) => service.getTrelloMemberDetails(trelloToken),
  },
  {
    name: 'getTrelloBoards',
    run: (service) => service.getTrelloBoards(trelloToken),
  },
  {
    name: 'getTrelloBoardsLists',
    run: (service) => service.getTrelloBoardsLists(trelloToken, 'board-1'),
  },
  {
    name: 'createTrelloCard',
    run: (service) =>
      service.createTrelloCard(trelloToken, 'list-1', { name: 'Bug' }),
  },
  {
    name: 'trelloAttachmentsIssue',
    run: (service) => service.trelloAttachmentsIssue(trelloToken, 'card-1', {}),
  },
];

function okResponse(body: unknown = {}) {
  return { status: 200, ok: true, json: async () => body };
}

/** What node-fetch 2 rejects with on a network error: the message holds the full request URL. */
function networkError(url: string) {
  const err: any = new Error(
    `request to ${url} failed, reason: getaddrinfo ENOTFOUND api.trello.com`,
  );
  err.name = 'FetchError';
  err.type = 'system';
  err.code = 'ENOTFOUND';
  err.errno = 'ENOTFOUND';
  return err;
}

/** A plain-text 4xx: node-fetch's json() rejects with the full request URL in the message. */
function plainTextErrorResponse(url: string) {
  return {
    status: 400,
    ok: false,
    json: async () => {
      const err: any = new Error(
        `invalid json response body at ${url} reason: Unexpected token 'i', "invalid id" is not valid JSON`,
      );
      err.name = 'FetchError';
      err.type = 'invalid-json';
      throw err;
    },
  };
}

describe('AtlassianApiService: tokens stay out of URLs and logs', () => {
  let service: AtlassianApiService;
  const httpGet = jest.fn();
  let spies: jest.SpyInstance[];

  /** Everything the console spies received, with objects and errors expanded the way Node prints them. */
  function logged(): string {
    return spies
      .flatMap((spy) => spy.mock.calls)
      .flat()
      .map((arg) =>
        typeof arg === 'string'
          ? arg
          : inspect(arg, { depth: 10, showHidden: true }),
      )
      .join('\n');
  }

  beforeEach(() => {
    mockFetch.mockReset();
    httpGet.mockReset();
    const config: Record<string, string> = {
      TRELLO_KEY: trelloKey,
      JIRA_CLIENT_ID: 'jira-client',
      JIRA_CLIENT_SECRET: 'jira-client-secret',
      API_BASE_URL: 'https://api.test',
      WEBSITE_URL: 'https://web.test',
    };
    service = new AtlassianApiService(
      { get: (key: string) => config[key] } as any,
      { get: httpGet } as any,
      {} as any,
    );
    spies = (['log', 'error', 'warn', 'info', 'debug'] as const).map((level) =>
      jest.spyOn(console, level).mockImplementation(() => undefined),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe.each(trelloCalls)('$name', ({ run }) => {
    it('sends the key and token in the Authorization header, not the URL', async () => {
      mockFetch.mockResolvedValue(okResponse());

      await run(service);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toMatch(/^https:\/\/api\.trello\.com\/1\//);
      expect(url).not.toContain('token=');
      expect(url).not.toContain('key=');
      expect(url).not.toContain(trelloToken);
      expect(url).not.toContain(trelloKey);
      expect(init.headers.Authorization).toBe(
        `OAuth oauth_consumer_key="${trelloKey}", oauth_token="${trelloToken}"`,
      );
    });

    it('does not log the token when the request fails on the network', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        throw networkError(url);
      });

      await run(service);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(logged()).not.toContain(trelloToken);
      expect(logged()).not.toContain('api.trello.com');
    });

    it('does not log the token when Trello answers with a plain-text error', async () => {
      mockFetch.mockImplementation(async (url: string) =>
        plainTextErrorResponse(url),
      );

      await run(service);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(logged()).not.toContain(trelloToken);
      expect(logged()).not.toContain('api.trello.com');
    });
  });

  it('logs only a fixed message with the error code or the HTTP status', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      throw networkError(url);
    });
    await expect(service.getTrelloBoards(trelloToken)).resolves.toEqual([]);
    expect(logged()).toContain('ENOTFOUND');
    expect(logged()).not.toContain('request to');

    spies.forEach((spy) => spy.mockClear());
    mockFetch.mockImplementation(async (url: string) =>
      plainTextErrorResponse(url),
    );
    await expect(
      service.getTrelloBoardsLists(trelloToken, 'board-1'),
    ).resolves.toEqual([]);
    expect(logged()).toContain('400');
    expect(logged()).not.toContain('invalid json');
  });

  it('URL-encodes the board and card ids', async () => {
    mockFetch.mockResolvedValue(okResponse());

    await service.getTrelloBoardsLists(trelloToken, 'b/../x?y=1');
    await service.createTrelloCard(trelloToken, 'bogus&idBoard=2', {});
    await service.trelloAttachmentsIssue(trelloToken, 'c/../d#e', {});

    const urls = mockFetch.mock.calls.map(([url]) => url);
    expect(urls).toEqual([
      'https://api.trello.com/1/boards/b%2F..%2Fx%3Fy%3D1/lists',
      'https://api.trello.com/1/cards?idList=bogus%26idBoard%3D2',
      'https://api.trello.com/1/cards/c%2F..%2Fd%23e/attachments',
    ]);
  });

  it('keeps the board fields filter on the boards request', async () => {
    mockFetch.mockResolvedValue(okResponse([]));

    await service.getTrelloBoards(trelloToken);

    expect(mockFetch.mock.calls[0][0]).toBe(
      'https://api.trello.com/1/members/me/boards?fields=name,url',
    );
  });

  describe('getAccessibleResources', () => {
    it('does not log the Jira bearer token when the request fails', async () => {
      httpGet.mockRejectedValue({
        config: { headers: { Authorization: `Bearer ${jiraToken}` } },
      });

      const res = await service.getAccessibleResources(jiraToken);

      expect(res.data).toBeNull();
      expect(logged()).not.toContain(jiraToken);
    });

    it('logs the HTTP status of a failed request, not the error', async () => {
      const err: any = new Error('Request failed with status code 401');
      err.code = 'ERR_BAD_REQUEST';
      err.config = {
        url: 'https://api.atlassian.com/oauth/token/accessible-resources',
        headers: { Authorization: `Bearer ${jiraToken}` },
      };
      err.response = { status: 401, data: { message: 'Unauthorized' } };
      httpGet.mockRejectedValue(err);

      await service.getAccessibleResources(jiraToken);

      expect(logged()).not.toContain(jiraToken);
      expect(logged()).not.toContain('Request failed');
      expect(logged()).toContain('401');
    });
  });
});
