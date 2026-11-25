/**
 * Members leaving a workspace at the same time, through the real Firebase Admin SDK on the
 * Realtime Database emulator. Each leave changes the member list and the team list in
 * transactions, so neither puts back a member the other one took out. Creating and deleting a
 * workspace change each user's list of workspaces in a transaction on the list the same way.
 */
import * as admin from 'firebase-admin';
import { parseCollectionToArray } from '../src/services/utils/helpers';
import { WorkspaceMembersService } from '../src/module/workspace/services/members.service';
import { WorkspaceUtilitiesService } from '../src/module/workspace/services/utilities.service';
import { WorkspacesService } from '../src/module/workspace/services/workspace.service';
import {
  changeWorkspaceMembers,
  changeWorkspaceTeams,
} from '../src/module/workspace/services/change-workspace-collection';
import { emulatorApp } from './setup-emulators';

// Image resizing is not under test; this keeps the native module from loading.
jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }));

describe('members leaving a workspace at the same time, on the emulators', () => {
  // The services use the default app, as in the API.
  let app: admin.app.App;
  const utilities = new WorkspaceUtilitiesService();
  const workspaces = new WorkspacesService(
    utilities,
    new WorkspaceMembersService(utilities),
  );

  const read = async (path: string) =>
    (await app.database().ref(path).get()).val();
  const ids = (list: unknown) =>
    parseCollectionToArray<any>(list as object).map((x) => x?.id);

  beforeAll(() => {
    app = emulatorApp('[DEFAULT]');
  });

  afterAll(async () => {
    await app.delete();
  });

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    await app.database().ref().set(null);
    await app
      .database()
      .ref()
      .update({
        'users/uid-admin': {
          email: 'admin@example.test',
          workspaceIds: ['ws1'],
        },
        'users/uid-a': { email: 'a@example.test', workspaceIds: ['ws1'] },
        'users/uid-b': { email: 'b@example.test', workspaceIds: ['ws1'] },
        'workspaces/ws1': {
          id: 'ws1',
          name: 'Team space',
          admin: 'uid-admin',
          members: [{ id: 'uid-admin' }, { id: 'uid-a' }, { id: 'uid-b' }],
          teams: [
            {
              id: 'team1',
              admin: 'uid-admin',
              name: 'Team',
              workspaceId: 'ws1',
              members: [{ id: 'uid-admin' }, { id: 'uid-a' }, { id: 'uid-b' }],
            },
          ],
        },
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps both members out when two leave at once', async () => {
    const [a, b] = await Promise.all([
      workspaces.leaveWorkspace('uid-a', 'ws1'),
      workspaces.leaveWorkspace('uid-b', 'ws1'),
    ]);

    expect(a.status).toBe('success');
    expect(b.status).toBe('success');
    // Still an array: readers call `workspace.members.find(...)`.
    const members = await read('workspaces/ws1/members');
    expect(Array.isArray(members)).toBe(true);
    expect(ids(members)).toEqual(['uid-admin']);
    const teams = await read('workspaces/ws1/teams');
    expect(Array.isArray(teams)).toBe(true);
    expect(ids(teams[0].members)).toEqual(['uid-admin']);
    expect(await read('users/uid-a/workspaceIds')).toBeNull();
    expect(await read('users/uid-b/workspaceIds')).toBeNull();
  });

  // The first run of a transaction gets the local guess (`null` for a list nobody here listens
  // to), and a second change of the same list started meanwhile in this process (another request
  // on the same API instance) gets what the first one made of that guess. What the second one
  // decides on that list must still be checked against the stored one.
  it('keeps a member leaving while an add of a member is pending in the same process', async () => {
    const [added, left] = await Promise.all([
      changeWorkspaceMembers('ws1', (members) =>
        members.some((member) => member.id === 'uid-admin')
          ? {}
          : { items: [...members, { id: 'uid-admin' }] },
      ),
      changeWorkspaceMembers('ws1', (members) =>
        members.some((member) => member.id === 'uid-a')
          ? { items: members.filter((member) => member.id !== 'uid-a') }
          : {},
      ),
    ]);

    expect(added.ok).toBe(true);
    expect(left.ok).toBe(true);
    expect(ids(await read('workspaces/ws1/members'))).toEqual([
      'uid-admin',
      'uid-b',
    ]);
  });

  it('takes a member out of a team while a team add is pending in the same process', async () => {
    const [added, removed] = await Promise.all([
      changeWorkspaceTeams('ws1', (teams) => ({
        items: [
          ...teams,
          {
            id: 'team2',
            admin: 'uid-admin',
            name: 'Design',
            workspaceId: 'ws1',
            members: [],
          },
        ],
      })),
      changeWorkspaceTeams('ws1', (teams) => {
        const team = teams.find((t) => t.id === 'team1');
        return team
          ? {
              items: teams.map((t) =>
                t.id === 'team1'
                  ? {
                      ...t,
                      members: parseCollectionToArray<any>(t.members).filter(
                        (member) => member?.id !== 'uid-a',
                      ),
                    }
                  : t,
              ),
            }
          : { error: 'not found' };
      }),
    ]);

    expect(added.ok).toBe(true);
    expect(removed).toMatchObject({ ok: true });
    const teams = parseCollectionToArray<any>(
      await read('workspaces/ws1/teams'),
    );
    expect(teams.map((team) => team.name)).toEqual(['Team', 'Design']);
    expect(ids(teams[0].members)).toEqual(['uid-admin', 'uid-b']);
  });

  // A create adds its workspace to the user's list, and a delete takes it out of each member's
  // list, in a transaction on that list: a write of the list read earlier dropped the id the other
  // request added meanwhile.
  describe("the user's list of workspaces", () => {
    const workspaceIdsOf = async (uid: string) =>
      parseCollectionToArray<string>(await read(`users/${uid}/workspaceIds`));
    const create = (name: string) =>
      workspaces.createNewWorkspace('uid-a', 'A', 'a@example.test', name);

    it('keeps both workspaces when one user creates two at once', async () => {
      const [first, second] = await Promise.all([
        create('First'),
        create('Second'),
      ]);

      expect(first.status).toBe('success');
      expect(second.status).toBe('success');
      const listed = await workspaceIdsOf('uid-a');
      expect(listed).toHaveLength(3);
      expect(listed).toEqual(
        expect.arrayContaining(['ws1', first.data?.id, second.data?.id]),
      );
    });

    it('drops a deleted workspace and keeps one a member creates meanwhile', async () => {
      const [deleted, created] = await Promise.all([
        workspaces.deleteWorkspace('uid-admin', 'ws1'),
        create('Mine'),
      ]);

      expect(deleted.status).toBe('success');
      expect(created.status).toBe('success');
      expect(await read('workspaces/ws1')).toBeNull();
      expect(await workspaceIdsOf('uid-a')).toEqual([created.data?.id]);
      expect(await workspaceIdsOf('uid-admin')).toEqual([]);
    });

    it('takes a deleted workspace out of a list stored as an object', async () => {
      // A list with a hole comes back as an object.
      await app
        .database()
        .ref('users/uid-b/workspaceIds')
        .set({ 1: 'ws1', 5: 'ws-other' });

      const deleted = await workspaces.deleteWorkspace('uid-admin', 'ws1');

      expect(deleted.status).toBe('success');
      expect(await workspaceIdsOf('uid-b')).toEqual(['ws-other']);
    });
  });
});
