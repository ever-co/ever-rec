/**
 * `ImageService.share` is called by the share route and by the messaging and issue-tracker
 * integrations with an id taken from the request. A link is made only for an image the caller
 * owns; an unknown id, another user's image or an id that is not a plain id is refused with
 * nothing written, and an owner still gets the same link every time.
 */
import { ForbiddenException } from '@nestjs/common';
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

const mockDb: { data: Record<string, any>; writes: string[] } = {
  data: {},
  writes: [],
};
jest.mock('firebase-admin', () => {
  const read = (path: string) => {
    let value: any = mockDb.data;
    for (const segment of path.split('/').filter(Boolean)) {
      value = value?.[segment];
    }
    return value ?? null;
  };
  return {
    database: () => ({
      ref: (path: string) => ({
        get: async () => ({ val: () => read(path) }),
        set: async () => {
          mockDb.writes.push(path);
        },
        orderByChild: (child: string) => ({
          equalTo: (wanted: string) => ({
            get: async () => {
              const all = read(path) ?? {};
              const found = Object.fromEntries(
                Object.entries<any>(all).filter(
                  ([, v]) => v?.[child] === wanted,
                ),
              );
              return {
                val: () => (Object.keys(found).length ? found : null),
              };
            },
          }),
        }),
      }),
    }),
  };
});

describe('ImageService.share', () => {
  const emit = jest.fn();
  let service: ImageService;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    service = new ImageService(
      {} as any,
      {} as any,
      { emit } as any,
      {} as any,
    );
    emit.mockReset();
    mockDb.writes = [];
    mockDb.data = {
      users: { 'uid-owner': { screenshots: { img1: { id: 'img1' } } } },
      shared: {
        existing: {
          uid: 'uid-owner',
          imageId: 'img1',
          uidImageId: 'uid-owner|img1',
        },
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the existing link of an own image and writes nothing', async () => {
    await expect(service.share('uid-owner', 'img1')).resolves.toBe('existing');
    expect(mockDb.writes).toEqual([]);
  });

  it('creates a link for an own image that has none', async () => {
    mockDb.data.shared = {};
    const link = await service.share('uid-owner', 'img1');
    expect(link).toHaveLength(12);
    expect(mockDb.writes).toEqual([`shared/${link}`]);
  });

  it('refuses an image that does not exist or belongs to someone else', async () => {
    mockDb.data.shared = {};
    await expect(service.share('uid-owner', 'gone')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.share('uid-other', 'img1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(mockDb.writes).toEqual([]);
  });

  it('refuses ids that are not plain ids', async () => {
    for (const id of ['img1/x', '', 'a.b', '$x', undefined, null, { a: 1 }]) {
      await expect(
        service.share('uid-owner', id as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
    await expect(service.share('', 'img1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(mockDb.writes).toEqual([]);
  });
});
