/**
 * `ImageService.updateImageData` used to `update()` whatever id it was given: an id that does not
 * exist got a partial record, and an id with slashes wrote under another path of the item tree.
 * Now an id that is not a plain id is refused (400) and an image the caller does not have is a
 * 404, with nothing written either way.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
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

const mockDb: { data: Record<string, any>; updates: [string, any][] } = {
  data: {},
  updates: [],
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
        get: async () => ({
          val: () => read(path),
          exists: () => read(path) !== null,
        }),
        update: async (value: any) => {
          mockDb.updates.push([path, value]);
        },
      }),
    }),
  };
});

describe('ImageService.updateImageData', () => {
  let service: ImageService;
  const emitMarkerUpdate = jest.fn();

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    service = new ImageService(
      {} as any,
      {} as any,
      { emit: jest.fn() } as any,
      { emitMarkerUpdate } as any,
    );
    jest
      .spyOn(service, 'getImageByIdPrivate')
      .mockResolvedValue({ stub: true } as any);
    emitMarkerUpdate.mockReset();
    mockDb.updates = [];
    mockDb.data = {
      users: { 'uid-owner': { screenshots: { img1: { id: 'img1' } } } },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const update = (uid: string, id: any) =>
    service.updateImageData(uid, id, false, false, [], 'New title');

  it('updates an image of the caller', async () => {
    await expect(update('uid-owner', 'img1')).resolves.toEqual({ stub: true });

    expect(mockDb.updates).toHaveLength(1);
    expect(mockDb.updates[0][0]).toBe('users/uid-owner/screenshots/img1');
    expect(mockDb.updates[0][1].title).toBe('New title');
  });

  it('is a 404, and creates no record, for an image that does not exist', async () => {
    await expect(update('uid-owner', 'gone')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockDb.updates).toEqual([]);
  });

  it('is a 404 for an image that belongs to someone else', async () => {
    await expect(update('uid-other', 'img1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockDb.updates).toEqual([]);
  });

  it('refuses an id that is not a plain id, so no other path of the item can be written', async () => {
    const ids = ['img1/likes', 'img1/uniqueViews', '../x', '', undefined];
    for (const id of ids) {
      await expect(update('uid-owner', id)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
    expect(mockDb.updates).toEqual([]);
  });
});
