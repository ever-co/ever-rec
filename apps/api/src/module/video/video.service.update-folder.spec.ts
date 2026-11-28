/**
 * `VideoService.updateVideoFolderData` (PUT /video/folder) used to `update()` whatever folder id
 * and parent the body named. "" wrote into the folder list itself, `<id>/children` wrote inside
 * another folder, an unknown id (a folder deleted in another tab) got a partial ghost folder and a
 * success answer, and a new parentId moved a folder without its nest level or the children of
 * either parent, past the two-level limit.
 *
 * Now an id that is not a plain id and a parent that is not the stored one are refused (400), and
 * a folder that is not stored is a 404, with nothing written in each case. Renames, colors and
 * item counts still work, with the stored parent resent as the clients do.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
          const target = read(path);
          if (target) Object.assign(target, value);
        },
      }),
    }),
  };
});

describe('VideoService.updateVideoFolderData', () => {
  let service: VideoService;
  const emit = jest.fn();

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
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
            top: {
              name: 'Top',
              parentId: false,
              nestLevel: 0,
              children: ['middle'],
              items: 1,
            },
            middle: {
              name: 'Middle',
              parentId: 'top',
              nestLevel: 1,
              children: ['bottom'],
              items: 2,
            },
            bottom: {
              name: 'Bottom',
              parentId: 'middle',
              nestLevel: 2,
              items: 3,
            },
            other: { name: 'Other', parentId: false, nestLevel: 0, items: 0 },
          },
        },
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const update = (
    folderId: any,
    parentId: any,
    { name = 'Renamed', items = 2, color = '#fff', uid = 'uid-owner' } = {},
  ) => service.updateVideoFolderData(uid, folderId, name, parentId, items, color);

  const folderWrites = () =>
    mockDb.writes.filter(([, path]) => path.startsWith('users/uid-owner/videoFolders'));

  it('renames a folder, with its stored parent resent as the clients do', async () => {
    const res = await update('middle', 'top');

    expect(res.status).toBe(ResStatusEnum.success);
    expect(res.data.folder).toMatchObject({
      name: 'Renamed',
      parentId: 'top',
      nestLevel: 1,
    });
    expect(folderWrites()).toEqual([
      [
        'update',
        'users/uid-owner/videoFolders/middle',
        expect.objectContaining({ name: 'Renamed', color: '#fff', items: 2 }),
      ],
    ]);
    expect(folderWrites()[0][2].parentId ?? 'top').toBe('top');
  });

  it('changes the color and the item count of a top-level folder', async () => {
    const res = await update('other', false, {
      name: 'Other',
      items: 5,
      color: '#000',
    });

    expect(res.status).toBe(ResStatusEnum.success);
    expect(res.data.folder).toMatchObject({
      parentId: false,
      color: '#000',
      items: 5,
    });
    expect(folderWrites()).toHaveLength(1);
    expect(folderWrites()[0][1]).toBe('users/uid-owner/videoFolders/other');
  });

  it('updates a folder when the body names no parent', async () => {
    const res = await update('bottom', undefined);

    expect(res.status).toBe(ResStatusEnum.success);
    expect(res.data.folder).toMatchObject({
      name: 'Renamed',
      parentId: 'middle',
    });
    expect(folderWrites()).toHaveLength(1);
  });

  it('refuses a folder id that is not a plain id, so no other path can be written', async () => {
    const ids = ['', 'top/children', 'top/children/0', '../x', undefined, 5];
    for (const id of ids) {
      await expect(update(id, false)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
    expect(mockDb.writes).toEqual([]);
  });

  it('is a 404, and creates no ghost folder, for a folder that is not stored', async () => {
    await expect(update('deleted-in-another-tab', false)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockDb.writes).toEqual([]);
    expect(emit).not.toHaveBeenCalled();
  });

  it('is a 404 for a folder of another user', async () => {
    await expect(
      update('middle', 'top', { uid: 'uid-other' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockDb.writes).toEqual([]);
  });

  it.each([
    { what: 'a top folder under a level-2 folder', folderId: 'top', parentId: 'bottom' },
    { what: 'a level-1 folder to the top level', folderId: 'middle', parentId: false },
    { what: 'a level-2 folder under another folder', folderId: 'bottom', parentId: 'other' },
    { what: 'a folder under a folder that is not stored', folderId: 'other', parentId: 'gone' },
  ])(
    'refuses to move $what, and writes nothing',
    async ({ folderId, parentId }) => {
      await expect(update(folderId, parentId)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockDb.writes).toEqual([]);
      expect(mockDb.data.users['uid-owner'].videoFolders.top.children).toEqual([
        'middle',
      ]);
    },
  );
});
