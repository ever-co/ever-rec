/**
 * Who may open, change or delete a whiteboard is decided by the `admin` of the whiteboard record,
 * which only the API writes. The list `users/<uid>/whiteboardIds` is writable by the user, so
 * putting somebody else's whiteboard id in it grants nothing, and an owner whose list is empty or
 * damaged keeps their whiteboards. Refusals write nothing.
 */
import { WhiteboardService } from './whiteboards.service';

const mockDb: {
  data: Record<string, any>;
  writes: string[];
  // The values passed to multi-location updates, by the path of the ref they were called on.
  updates: Record<string, Record<string, any>>;
  // What a transaction on a path committed, and the values its function was called with.
  transactions: Record<string, { calledWith: any[]; committed: any }>;
  // What the database really holds at the path of a transaction, once the first guess is refused.
  transactionRealValue?: any;
  failUpdate?: boolean;
} = {
  data: {},
  writes: [],
  updates: {},
  transactions: {},
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
          mockDb.writes.push(`set ${path}`);
        },
        update: async (values: Record<string, any>) => {
          if (mockDb.failUpdate) {
            throw new Error('write failed');
          }
          mockDb.writes.push(`update ${path ?? ''}`);
          mockDb.updates[path ?? ''] = values;
        },
        // Like the real client: the function is first called with the value the client has cached
        // (null here), then again with the real value when the database refuses that guess.
        transaction: async (update: (current: any) => any) => {
          const calledWith: any[] = [];
          const run = (current: any) => {
            calledWith.push(current);
            return update(current);
          };
          run(null);
          const real = mockDb.transactionRealValue ?? read(path);
          const committed = run(real);
          mockDb.writes.push(`transaction ${path}`);
          mockDb.transactions[path] = { calledWith, committed };
          return { committed: true };
        },
        remove: async () => {
          mockDb.writes.push(`remove ${path}`);
        },
        orderByChild: (child: string) => ({
          equalTo: (wanted: string) => ({
            get: async () => {
              const found = Object.fromEntries(
                Object.entries<any>(read(path) ?? {}).filter(
                  ([, value]) => value?.[child] === wanted,
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

const MAIN = 'whiteboards/mainCollection';

describe('WhiteboardService authorization', () => {
  let service: WhiteboardService;
  const whiteboard = (id: string, admin: string, extra = {}) => ({
    id,
    name: `Board ${id}`,
    admin,
    created: 1,
    trash: false,
    favorite: false,
    isPublic: false,
    ...extra,
  });

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    service = new WhiteboardService();
    mockDb.writes = [];
    mockDb.updates = {};
    mockDb.transactions = {};
    mockDb.transactionRealValue = undefined;
    mockDb.failUpdate = false;
    mockDb.data = {
      users: {
        'uid-owner': { whiteboardIds: ['wbOwned1'] },
        // Has put the id of a whiteboard that is not theirs in their own list.
        'uid-attacker': { whiteboardIds: ['wbOwned1', 'wbOwned2'] },
        'uid-empty-list': {},
        'uid-damaged-list': { whiteboardIds: 'x' },
      },
      whiteboards: {
        mainCollection: {
          wbOwned1: whiteboard('wbOwned1', 'uid-owner'),
          wbOwned2: whiteboard('wbOwned2', 'uid-owner', { isPublic: true }),
          wbMine: whiteboard('wbMine', 'uid-empty-list'),
          wbMine2: whiteboard('wbMine2', 'uid-damaged-list'),
        },
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('a user who put another user’s whiteboard id in their own list', () => {
    it('cannot read it', async () => {
      const result = await service.getWhiteboardById(
        'uid-attacker',
        'wbOwned1',
      );

      expect(result.data).toBeNull();
      expect(result.message).toContain('belong');
    });

    it('cannot change it, and nothing is written', async () => {
      const result = await service.updateWhiteboardData(
        'uid-attacker',
        'wbOwned1',
        true,
        true,
        true,
        'Taken',
      );

      expect(result.data).toBeNull();
      expect(mockDb.writes).toEqual([]);
    });

    it('cannot delete it, and nothing is written', async () => {
      const result = await service.deleteWhiteboard('uid-attacker', 'wbOwned1');

      expect(result.data).toBeNull();
      expect(mockDb.writes).toEqual([]);
    });

    it('does not see it in their list of whiteboards', async () => {
      const result = await service.getUserWhiteboards('uid-attacker');

      expect(result.data).toEqual([]);
    });
  });

  describe('the whiteboard’s admin', () => {
    it('reads it', async () => {
      const result = await service.getWhiteboardById('uid-owner', 'wbOwned1');

      expect(result.data).toEqual(whiteboard('wbOwned1', 'uid-owner'));
    });

    it('lists exactly their whiteboards', async () => {
      const result = await service.getUserWhiteboards('uid-owner');

      expect(result.data.map((item) => item.id).sort()).toEqual([
        'wbOwned1',
        'wbOwned2',
      ]);
    });

    it('updates it', async () => {
      await service.updateWhiteboardData(
        'uid-owner',
        'wbOwned1',
        false,
        true,
        false,
        'Renamed',
      );

      expect(mockDb.writes).toEqual([`update ${MAIN}/wbOwned1`]);
    });

    it('deletes it and takes it out of their list', async () => {
      const result = await service.deleteWhiteboard('uid-owner', 'wbOwned1');

      expect(result.data).toEqual(whiteboard('wbOwned1', 'uid-owner'));
      expect(mockDb.writes).toEqual([
        `remove ${MAIN}/wbOwned1`,
        'transaction users/uid-owner/whiteboardIds',
      ]);
    });

    it('takes only that id out of the list, and keeps the others from the real value', async () => {
      // The list changed since the service last looked: a second whiteboard was added.
      mockDb.transactionRealValue = ['wbOwned1', 'wbNew'];

      await service.deleteWhiteboard('uid-owner', 'wbOwned1');

      const { calledWith, committed } =
        mockDb.transactions['users/uid-owner/whiteboardIds'];
      // The first guess (null) is passed through untouched, so the database refuses it and retries.
      expect(calledWith).toEqual([null, ['wbOwned1', 'wbNew']]);
      expect(committed).toEqual(['wbNew']);
    });

    it('leaves a damaged list as it is when deleting', async () => {
      mockDb.transactionRealValue = 'x';

      await service.deleteWhiteboard('uid-owner', 'wbOwned1');

      expect(
        mockDb.transactions['users/uid-owner/whiteboardIds'].committed,
      ).toBe('x');
    });

    it('keeps their whiteboards when their own list is empty or damaged', async () => {
      for (const [uid, id] of [
        ['uid-empty-list', 'wbMine'],
        ['uid-damaged-list', 'wbMine2'],
      ]) {
        expect((await service.getWhiteboardById(uid, id)).data.id).toBe(id);
        expect((await service.getUserWhiteboards(uid)).data).toHaveLength(1);
      }
    });
  });

  describe('ids that are not plain ids', () => {
    it('are refused with nothing written', async () => {
      for (const id of ['wbOwned1/name', '..', '', 'a.b', '$x', undefined]) {
        for (const result of [
          await service.getWhiteboardById('uid-owner', id as any),
          await service.updateWhiteboardData(
            'uid-owner',
            id as any,
            true,
            true,
            true,
          ),
          await service.deleteWhiteboard('uid-owner', id as any),
          await service.getWhiteboardByIdShared(id as any),
        ]) {
          expect(result.data).toBeNull();
        }
      }
      expect(mockDb.writes).toEqual([]);
    });

    it('are refused for a caller without a uid', async () => {
      const result = await service.getWhiteboardById(undefined, 'wbOwned1');

      expect(result.data).toBeNull();
      expect((await service.getUserWhiteboards(undefined)).data).toBeNull();
    });
  });

  describe('a shared whiteboard', () => {
    it('is served when it is public and refused when it is not', async () => {
      expect((await service.getWhiteboardByIdShared('wbOwned2')).data.id).toBe(
        'wbOwned2',
      );
      expect(
        (await service.getWhiteboardByIdShared('wbOwned1')).data,
      ).toBeNull();
    });
  });

  describe('createNewWhiteboard', () => {
    it('writes the record with the caller as admin and keeps their list in step', async () => {
      const result = await service.createNewWhiteboard(
        'uid-damaged-list',
        'Name',
        'a@example.test',
        'Fresh',
      );

      expect(result.data.admin).toBe('uid-damaged-list');
      // One write for both places: the record and the list.
      expect(mockDb.writes).toEqual(['update ']);
      expect(mockDb.updates['']).toEqual({
        [`${MAIN}/${result.data.id}`]: result.data,
        'users/uid-damaged-list/whiteboardIds': [result.data.id],
      });
    });

    it('appends to the list the user already has', async () => {
      const result = await service.createNewWhiteboard(
        'uid-owner',
        'Name',
        'a@example.test',
        'Fresh',
      );

      expect(mockDb.updates['']['users/uid-owner/whiteboardIds']).toEqual([
        'wbOwned1',
        result.data.id,
      ]);
    });

    it('leaves neither the record nor the list entry behind when the write fails', async () => {
      mockDb.failUpdate = true;

      const result = await service.createNewWhiteboard(
        'uid-owner',
        'Name',
        'a@example.test',
        'Fresh',
      );

      expect(result.data).toBeNull();
      // Nothing was written to the record or the list on their own.
      expect(mockDb.writes).toEqual([]);
      expect(mockDb.updates).toEqual({});
    });

    it('refuses an unknown user', async () => {
      const result = await service.createNewWhiteboard(
        'uid-nobody',
        'Name',
        'a@example.test',
        'Fresh',
      );

      expect(result.data).toBeNull();
      expect(mockDb.writes).toEqual([]);
    });
  });
});
