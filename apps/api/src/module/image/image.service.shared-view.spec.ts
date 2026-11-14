/**
 * The share page of an image names its owner from the share record, never from the `uid` field of
 * the image (its owner can write that field), and sends neither the owner's email nor the uids of
 * the people who liked it. Likes are not written by the image update, and the image list counts the
 * comments of the image, not of a video with the same id.
 */
import { ImageService } from './image.service';

jest.mock('sharp', () => ({}), { virtual: true });
jest.mock('../editor-websocket-module/editor.gateway', () => ({
  EditorGateway: class {},
}));
jest.mock('../../services/shared/shared.service', () => ({
  SharedService: class {},
}));
jest.mock('../../services/shared/folders.shared.service', () => ({
  FoldersSharedService: class {},
}));

const mockDb: { data: Record<string, any>; updates: Record<string, any> } = {
  data: {},
  updates: {},
};
jest.mock('firebase-admin', () => {
  const read = (path: string) => {
    let value: any = mockDb.data;
    for (const segment of path.split('/').filter(Boolean)) {
      value = value?.[segment];
    }
    return value ?? null;
  };
  const ref = (path: string) => ({
    get: async () => ({
      val: () => read(path),
      exists: () => read(path) != null,
    }),
    update: async (data: any) => {
      mockDb.updates[path] = data;
    },
    orderByKey: () => ({
      equalTo: (key: string) => ({
        get: async () => {
          const value = (read(path) ?? {})[key];
          return { val: () => (value ? { [key]: value } : null) };
        },
      }),
    }),
    orderByChild: () => ({ get: async () => ({ val: () => read(path) }) }),
  });
  return {
    database: () => ({ ref }),
    storage: () => ({
      bucket: () => ({
        file: (path: string) => ({
          exists: async () => [false],
          getSignedUrl: async () => [`signed:${path}`],
        }),
      }),
    }),
  };
});

describe('ImageService shared view, update and list', () => {
  let service: ImageService;
  const editorGateway = { emitMarkerUpdate: jest.fn() };
  const sharedService = {
    sanitizeCommentsFromDB: (comments: any) => Object.values(comments ?? {}),
  };

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    service = new ImageService(
      sharedService as any,
      {} as any,
      { emit: jest.fn() } as any,
      editorGateway as any,
    );
    mockDb.updates = {};
    mockDb.data = {
      users: {
        'uid-owner': {
          displayName: 'Owner',
          photoURL: 'owner.png',
          email: 'owner@example.test',
          screenshots: {
            img1: {
              refName: 'a.png',
              title: 'Mine',
              // Written by the owner: names somebody else.
              uid: 'uid-victim',
              likes: [
                { uid: 'uid-a', timestamp: 1 },
                { uid: 'uid-b', timestamp: 2 },
              ],
              comments: { c1: { content: 'one' }, c2: { content: 'two' } },
            },
          },
          videos: {
            img1: { comments: { x: {}, y: {}, z: {} } },
          },
        },
        'uid-victim': {
          displayName: 'Victim',
          photoURL: 'victim.png',
          email: 'victim@example.test',
        },
        'uid-uploader': {
          displayName: 'Uploader',
          photoURL: 'uploader.png',
          email: 'uploader@example.test',
        },
      },
      shared: {
        link1: {
          uid: 'uid-owner',
          imageId: 'img1',
          uidImageId: 'uid-owner|img1',
        },
      },
      workspaces: {
        ws1: {
          screenshots: {
            item1: { refName: 'w.png', uid: 'uid-uploader', likes: [] },
          },
        },
      },
      sharedWorkspaceItems: {
        wlink: { workspaceId: 'ws1', itemId: 'item1', queryField: 'q' },
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getImageBySharedId', () => {
    it('names the owner from the share record, not from the image’s own uid', async () => {
      const result = await service.getImageBySharedId('link1', false);

      expect(result.image.owner).toEqual({
        displayName: 'Owner',
        photoURL: 'owner.png',
        id: 'uid-owner',
      });
      expect(result.image.dbData.uid).toBe('uid-owner');
    });

    it('sends no email at all', async () => {
      const result = await service.getImageBySharedId('link1', false);

      expect(result.image.owner).not.toHaveProperty('email');
      expect(JSON.stringify(result)).not.toContain('@example.test');
    });

    it('sends the likes without the uids of the likers', async () => {
      const result = await service.getImageBySharedId('link1', false);

      expect(result.image.dbData.likes).toEqual([
        { uid: '', timestamp: 1 },
        { uid: '', timestamp: 2 },
      ]);
      expect(JSON.stringify(result)).not.toContain('uid-a');
      expect(JSON.stringify(result)).not.toContain('uid-b');
    });

    it('keeps the viewer’s own like marked', async () => {
      const result = await service.getImageBySharedId('link1', false, 'uid-b');

      expect(result.image.dbData.likes).toEqual([
        { uid: '', timestamp: 1 },
        { uid: 'uid-b', timestamp: 2 },
      ]);
    });

    it('still reads a workspace item’s uploader from the item', async () => {
      const result = await service.getImageBySharedId('wlink', true);

      expect(result.image.owner).toEqual({
        displayName: 'Uploader',
        photoURL: 'uploader.png',
        id: 'uid-uploader',
      });
      expect(result.image.dbData.link).toBe(
        'signed:workspaces/ws1/screenshots/w.png',
      );
    });

    it('keeps serving the image file of the share record’s user', async () => {
      const result = await service.getImageBySharedId('link1', false);

      expect(result.image.dbData.link).toBe(
        'signed:users/uid-owner/screenshots/a.png',
      );
    });

    it('returns nothing for an unknown link', async () => {
      await expect(
        service.getImageBySharedId('nope', false),
      ).resolves.toBeNull();
    });
  });

  describe('updateImageData', () => {
    beforeEach(() => {
      jest.spyOn(service, 'getImageByIdPrivate').mockResolvedValue(null);
    });

    it('does not write the likes sent by the client', async () => {
      await service.updateImageData(
        'uid-owner',
        'img1',
        false,
        false,
        [{ uid: 'planted', timestamp: 9 }],
        'Renamed',
      );

      expect(mockDb.updates['users/uid-owner/screenshots/img1']).toEqual({
        title: 'Renamed',
        parentId: false,
        trash: false,
      });
    });

    it('does not reset the likes when the client sends none', async () => {
      await service.updateImageData(
        'uid-owner',
        'img1',
        undefined,
        true,
        undefined,
      );

      expect(mockDb.updates['users/uid-owner/screenshots/img1']).toEqual({
        trash: true,
      });
    });
  });

  describe('getFiles', () => {
    it('counts the comments of the image, not those of a video with the same id', async () => {
      const files = await service.getFiles('uid-owner', false);

      expect(files).toHaveLength(1);
      expect(files[0].dbData.commentsLength).toBe(2);
    });
  });
});
