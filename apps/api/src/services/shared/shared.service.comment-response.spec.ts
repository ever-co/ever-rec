/**
 * Comments are shown to viewers without the stored `uid` of their authors: the API resolves each
 * author's name and photo itself, and `isOwn` tells the viewer's client which comments it may edit
 * or delete. A stored `uid` that is not a plain id (a planted one) is never looked up.
 */
import { SharedService } from './shared.service';

const mockDb: { data: Record<string, any>; reads: string[] } = {
  data: {},
  reads: [],
};
jest.mock('firebase-admin', () => {
  const snapshot = (value: any) => ({
    val: () => value ?? null,
    exists: () => value != null,
  });
  const valueAt = (path: string) => {
    mockDb.reads.push(path.replace(/^\//, ''));
    let value: any = mockDb.data;
    for (const segment of path.split('/').filter(Boolean)) {
      value = value?.[segment];
    }
    return value;
  };
  return {
    database: () => ({
      ref: (path: string) => ({
        get: async () => snapshot(valueAt(path)),
        // The indexed lookup of an item's share record (`<uid>|<item id>`).
        orderByChild: (child: string) => ({
          equalTo: (expected: unknown) => ({
            get: async () => {
              const matches = Object.entries(valueAt(path) ?? {}).filter(
                ([, record]: [string, any]) => record?.[child] === expected,
              );
              return snapshot(
                matches.length ? Object.fromEntries(matches) : null,
              );
            },
          }),
        }),
        set: async () => undefined,
      }),
    }),
  };
});

const RAW_UIDS = ['uid-owner', 'uid-guest', 'uid-planted'];

describe('comment responses', () => {
  let service: SharedService;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    service = new SharedService({ emit: jest.fn() } as any);
    mockDb.reads = [];
    mockDb.data = {
      users: {
        'uid-owner': {
          email: 'owner@example.com',
          displayName: 'Olive Owner',
          photoURL: 'https://img.example/owner.png',
          videos: {
            vid1: {
              id: 'vid1',
              comments: {
                c1: {
                  id: 'c1',
                  content: 'from the owner',
                  timestamp: 3,
                  uid: 'uid-owner',
                  isEdited: false,
                },
                c2: {
                  id: 'c2',
                  content: 'from a guest',
                  timestamp: 2,
                  uid: 'uid-guest',
                  isEdited: true,
                  updatedTimestamp: 5,
                  extra: 'not part of the response',
                },
                c3: {
                  id: 'c3',
                  content: 'planted',
                  timestamp: 1,
                  uid: 'uid-owner/email',
                  isEdited: false,
                },
              },
            },
          },
        },
        'uid-guest': {
          email: 'guest@example.com',
          displayName: 'Gus Guest',
          photoUrl: 'https://img.example/guest.png',
        },
      },
      sharedVideos: {
        link1: {
          uid: 'uid-owner',
          videoId: 'vid1',
          uidVideoId: 'uid-owner|vid1',
        },
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const byId = (comments: any[]) =>
    Object.fromEntries(comments.map((comment) => [comment.id, comment]));

  const noRawUid = (value: unknown) => {
    const text = JSON.stringify(value);
    for (const uid of RAW_UIDS) {
      expect(text).not.toContain(uid);
    }
    expect(text).not.toContain('"uid"');
  };

  it('shows an anonymous viewer the author name and photo, and no uid', async () => {
    const result: any = await service.getCommentsById(
      'video',
      'vid1',
      undefined as any,
      true,
      'uid-owner',
    );
    const comments = byId(result.comments);

    expect(result.commentsLength).toBe(3);
    expect(comments.c1.user).toEqual({
      name: 'Olive Owner',
      photoURL: 'https://img.example/owner.png',
    });
    expect(comments.c2.user).toEqual({
      name: 'Gus Guest',
      photoURL: 'https://img.example/guest.png',
    });
    expect(result.comments.every((c: any) => c.isOwn === false)).toBe(true);
    noRawUid(result);
  });

  it('marks only the viewer’s own comments and shows their id to them alone', async () => {
    const result: any = await service.getCommentsById(
      'video',
      'vid1',
      'uid-guest',
      true,
      'uid-owner',
    );
    const comments = byId(result.comments);

    expect(comments.c2.isOwn).toBe(true);
    expect(comments.c2.user.id).toBe('uid-guest');
    expect(comments.c1.isOwn).toBe(false);
    expect(comments.c1.user.id).toBeUndefined();
    expect(comments.c3.isOwn).toBe(false);
    // No other user's id is in the answer.
    expect(JSON.stringify(result)).not.toContain('uid-owner');
    expect(JSON.stringify(result)).not.toContain('uid-planted');
  });

  it('keeps the owner’s edit and delete on their own comments of their own item', async () => {
    const result: any = await service.getItemById('video', 'vid1', 'uid-owner');
    const comments = byId(result.dbData.comments);

    expect(comments.c1.isOwn).toBe(true);
    expect(comments.c2.isOwn).toBe(false);
    expect(result.dbData.commentsLength).toBe(3);
    expect(JSON.stringify(result.dbData.comments)).not.toContain('uid-guest');
  });

  it('keeps the fields a client shows and drops everything else', async () => {
    const result: any = await service.getCommentsById(
      'video',
      'vid1',
      'uid-guest',
      true,
      'uid-owner',
    );
    const edited = byId(result.comments).c2;

    expect(edited).toEqual({
      id: 'c2',
      content: 'from a guest',
      timestamp: 2,
      updatedTimestamp: 5,
      isEdited: true,
      isOwn: true,
      user: {
        id: 'uid-guest',
        name: 'Gus Guest',
        photoURL: 'https://img.example/guest.png',
      },
    });
    expect(edited.extra).toBeUndefined();
  });

  it('does not look up a stored uid that is not a plain id', async () => {
    const result: any = await service.getCommentsById(
      'video',
      'vid1',
      undefined as any,
      true,
      'uid-owner',
    );

    expect(byId(result.comments).c3.user).toEqual({
      name: null,
      photoURL: null,
    });
    expect(mockDb.reads).not.toContain('users/uid-owner/email');
  });

  it('keeps newest first', async () => {
    const result: any = await service.getCommentsById(
      'video',
      'vid1',
      undefined as any,
      true,
      'uid-owner',
    );

    expect(result.comments.map((c: any) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('answers a new comment without the uid, as the viewer’s own', async () => {
    const result: any = await service.addComment(
      'video',
      'uid-owner',
      'uid-guest',
      'vid1',
      'hello',
      true,
    );

    expect(result.status).toBe('success');
    expect(result.data).toMatchObject({
      content: 'hello',
      isOwn: true,
      isEdited: false,
      user: { id: 'uid-guest' },
    });
    expect(result.data.uid).toBeUndefined();
  });

  it('answers an edit without the uid', async () => {
    const result: any = await service.updateCommentAPI(
      'video',
      'uid-guest',
      'uid-owner',
      'vid1',
      'c2',
      'edited',
      true,
    );

    expect(result.status).toBe('success');
    expect(result.data).toMatchObject({
      id: 'c2',
      content: 'edited',
      isEdited: true,
    });
    noRawUid(result.data);
  });
});
