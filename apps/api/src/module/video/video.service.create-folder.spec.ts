/**
 * `VideoService.createNewFolder` threw on `null.children` for a parent that is not stored
 * (deleted in another tab) and answered 500, and the ids from the body went straight into
 * database paths.
 *
 * Now a missing parent is an error response and an id that is not a plain id is refused (400),
 * with nothing written in each case. The nest limit (a level-2 parent is refused) is kept.
 */
import { BadRequestException } from '@nestjs/common';
import { ResStatusEnum } from '../../enums/ResStatusEnum';
import { VideoService } from './video.service';

jest.mock('sharp', () => ({}), { virtual: true });
jest.mock('src/services/utils/uploadVideoToBucket', () => ({
  uploadVideoToBucket: jest.fn(),
}));
jest.mock('../../services/utils/fixVideoWithFFMPEG', () => ({
  fixVideoWithFFMPEG: jest.fn(),
}));
jest.mock('../video-services/streamService.service', () => ({
  StreamServiceService: class {},
}));
jest.mock('../../services/shared/shared.service', () => ({
  SharedService: class {},
}));
jest.mock('../../services/shared/folders.shared.service', () => ({
  FoldersSharedService: class {},
}));

const mockDb: {
  data: Record<string, any>;
  writes: ['set' | 'update', string, any][];
} = {
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
        get: async () => ({
          val: () => read(path),
          exists: () => read(path) !== null,
        }),
        set: async (value: any) => {
          mockDb.writes.push(['set', path, value]);
        },
        update: async (value: any) => {
          mockDb.writes.push(['update', path, value]);
        },
      }),
    }),
  };
});

describe('VideoService.createNewFolder', () => {
  let service: VideoService;
  const emit = jest.fn();

  beforeEach(() => {
    service = new VideoService(
      {} as any,
      { emit } as any,
      {} as any,
      {} as any,
    );
    emit.mockReset();
    mockDb.writes = [];
    mockDb.data = {
      users: {
        'uid-owner': {
          videoFolders: {
            top: { name: 'Top', nestLevel: 0, children: ['middle'] },
            middle: { name: 'Middle', nestLevel: 1, children: ['bottom'] },
            bottom: { name: 'Bottom', nestLevel: 2 },
          },
        },
      },
    };
  });

  const create = (newId: any, parentId: any) =>
    service.createNewFolder(
      'uid-owner',
      'New',
      '#fff',
      undefined as any,
      newId,
      parentId,
    );

  it('creates a folder at the top level, with no parent to update', async () => {
    const res = await create('new1', undefined);

    expect(res.status).toBe(ResStatusEnum.success);
    expect(res.data).toMatchObject({ id: 'new1', nestLevel: 0 });
    expect(mockDb.writes).toEqual([
      [
        'set',
        'users/uid-owner/videoFolders/new1',
        expect.objectContaining({ parentId: false, nestLevel: 0 }),
      ],
    ]);
  });

  it.each([
    { level: 0, parentId: 'top', children: ['middle'] },
    { level: 1, parentId: 'middle', children: ['bottom'] },
  ])(
    'creates a folder under a level-$level parent and adds it to the children of the parent',
    async ({ level, parentId, children }) => {
      const nestLevel = level + 1;
      const res = await create('new1', parentId);

      expect(res.status).toBe(ResStatusEnum.success);
      expect(res.data).toMatchObject({ id: 'new1', parentId, nestLevel });
      expect(mockDb.writes).toEqual([
        [
          'update',
          `users/uid-owner/videoFolders/${parentId}`,
          { children: [...children, 'new1'] },
        ],
        [
          'set',
          'users/uid-owner/videoFolders/new1',
          expect.objectContaining({ parentId, nestLevel }),
        ],
      ]);
    },
  );

  it('refuses a folder under a level-2 parent, and writes nothing', async () => {
    const res = await create('new1', 'bottom');

    expect(res).toEqual({
      status: ResStatusEnum.error,
      message: 'Cannot create new folder. Nest level too deep.',
      error: null,
      data: null,
    });
    expect(mockDb.writes).toEqual([]);
  });

  it('answers "Parent folder not found." for a parent that is not stored, and writes nothing', async () => {
    const res = await create('new1', 'deleted-in-another-tab');

    expect(res).toEqual({
      status: ResStatusEnum.error,
      message: 'Parent folder not found.',
      error: null,
      data: null,
    });
    expect(mockDb.writes).toEqual([]);
    expect(emit).not.toHaveBeenCalled();
  });

  it('refuses a new id that is not a plain id, so no other path can be written', async () => {
    const ids = ['new1/name', 'top/children', '../x', '', undefined, 5];
    for (const id of ids) {
      await expect(create(id, 'top')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
    expect(mockDb.writes).toEqual([]);
  });

  it('refuses a parent id that is not a plain id, so no other path can be written', async () => {
    const ids = ['top/children', 'top/../middle', '../x', true];
    for (const id of ids) {
      await expect(create('new1', id)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
    expect(mockDb.writes).toEqual([]);
  });
});
