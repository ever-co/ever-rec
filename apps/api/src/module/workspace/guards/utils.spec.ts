/**
 * `evaluateAccess` decides whether a workspace member may use an image, video or folder at a given
 * level. When the permissions listed teams only, it used to answer "yes" to every member as soon
 * as the workspace had any team. These tests pin the answers for each shape of permissions.
 */
import {
  canAccessFolderById,
  canWriteVideoByName,
  evaluateAccess,
} from './utils';
import { PermissionAccessEnum } from '../Interfaces/Workspace';

jest.mock('firebase-admin', () => ({}));

const { READ, WRITE, ADMIN, NONE } = PermissionAccessEnum;

const workspace: any = {
  admin: 'admin',
  teams: [{ id: 't1' }, { id: 't2' }],
  members: [
    { id: 'admin' },
    { id: 'in-t1', teams: [{ id: 't1' }] },
    { id: 'in-t2', teams: [{ id: 't2' }] },
    { id: 'no-team' },
    { id: 'empty-teams', teams: [] },
  ],
};

const asUser = (id: string): any => ({ id });
const item = (access: any): any => ({ id: 'item', access });

describe('evaluateAccess', () => {
  describe('permissions that list teams only', () => {
    const teamOnly = item({ teams: [{ teamId: 't1', access: WRITE }] });

    it.each([
      ['a member of the listed team', 'in-t1', WRITE, true],
      ['a member of the listed team, lower level asked', 'in-t1', READ, true],
      [
        'a member of the listed team, higher level asked',
        'in-t1',
        ADMIN,
        false,
      ],
      ['a member of another team', 'in-t2', READ, false],
      ['a member with no teams', 'no-team', READ, false],
      ['a member with an empty team list', 'empty-teams', READ, false],
      ['a user who is not a member', 'stranger', READ, false],
      ['the workspace admin', 'admin', WRITE, true],
      ['the workspace admin, admin level asked', 'admin', ADMIN, true],
    ])('%s -> %s', (_label: any, uid: any, level: any, expected: any) => {
      expect(!!evaluateAccess(teamOnly, workspace, asUser(uid), level)).toBe(
        expected,
      );
    });

    it('does not let a listed team with NONE in', () => {
      const denied = item({ teams: [{ teamId: 't1', access: NONE }] });
      expect(!!evaluateAccess(denied, workspace, asUser('in-t1'), READ)).toBe(
        false,
      );
    });

    it('lets a member of any one of several listed teams in', () => {
      const two = item({
        teams: [
          { teamId: 't1', access: READ },
          { teamId: 't2', access: WRITE },
        ],
      });
      expect(!!evaluateAccess(two, workspace, asUser('in-t2'), WRITE)).toBe(
        true,
      );
      expect(!!evaluateAccess(two, workspace, asUser('in-t1'), WRITE)).toBe(
        false,
      );
    });
  });

  describe('permissions that list members only', () => {
    const userOnly = item({
      members: [
        { uid: 'in-t1', access: READ },
        { uid: 'in-t2', access: WRITE },
      ],
    });

    it.each([
      ['a listed member, enough level', 'in-t2', WRITE, true],
      ['a listed member, level too low', 'in-t1', WRITE, false],
      ['a listed member, read', 'in-t1', READ, true],
      ['a member who is not listed', 'no-team', READ, false],
    ])('%s', (_label: any, uid: any, level: any, expected: any) => {
      expect(!!evaluateAccess(userOnly, workspace, asUser(uid), level)).toBe(
        expected,
      );
    });
  });

  describe('someone who is no longer a member of the workspace', () => {
    it.each([
      [
        'a leftover member grant',
        { members: [{ uid: 'gone', access: WRITE }] },
      ],
      ['a leftover team grant', { teams: [{ teamId: 't1', access: WRITE }] }],
      [
        'leftover team and member grants',
        {
          teams: [{ teamId: 't1', access: WRITE }],
          members: [{ uid: 'gone', access: WRITE }],
        },
      ],
      ['no grants', {}],
    ])('gets nothing from %s', (_label: any, access: any) => {
      expect(
        !!evaluateAccess(item(access), workspace, asUser('gone'), READ),
      ).toBe(false);
    });
  });

  describe('permissions that list teams and members', () => {
    const both = item({
      teams: [{ teamId: 't1', access: READ }],
      members: [{ uid: 'no-team', access: WRITE }],
    });

    it('lets in a listed team member or a listed member, and nobody else', () => {
      expect(!!evaluateAccess(both, workspace, asUser('in-t1'), READ)).toBe(
        true,
      );
      expect(!!evaluateAccess(both, workspace, asUser('no-team'), WRITE)).toBe(
        true,
      );
      expect(!!evaluateAccess(both, workspace, asUser('in-t2'), READ)).toBe(
        false,
      );
    });
  });

  describe('team membership stored on the team (workspace.teams[].members)', () => {
    const stored: any = {
      admin: 'admin',
      teams: [
        { id: 't1', members: [{ id: 'admin' }, { id: 'in-t1' }] },
        { id: 't2', members: [{ id: 'in-t2' }] },
      ],
      members: [
        { id: 'admin' },
        { id: 'in-t1' },
        { id: 'in-t2' },
        { id: 'no-team' },
      ],
    };
    const teamOnly = item({ teams: [{ teamId: 't1', access: WRITE }] });

    it.each([
      ['a member of the listed team', 'in-t1', WRITE, true],
      ['a member of the listed team, read', 'in-t1', READ, true],
      ['a member of another team', 'in-t2', READ, false],
      ['a member with no team', 'no-team', READ, false],
    ])('%s -> %s', (_label: any, uid: any, level: any, expected: any) => {
      expect(!!evaluateAccess(teamOnly, stored, asUser(uid), level)).toBe(
        expected,
      );
    });
  });

  describe('permissions that list neither teams nor members', () => {
    it('keeps answering yes when the workspace has teams', () => {
      expect(
        !!evaluateAccess(item({}), workspace, asUser('no-team'), WRITE),
      ).toBe(true);
    });

    it('keeps answering no when the workspace has no teams', () => {
      const noTeams = { ...workspace, teams: undefined };
      expect(
        !!evaluateAccess(item({}), noTeams, asUser('no-team'), WRITE),
      ).toBe(false);
    });
  });
});

/**
 * `canAccessFolderById` used to look at the named folder only. A subfolder with no permissions of
 * its own stayed open to a member the admin had shut out of its parent folder, although the
 * subfolder's id is in the folder list every member gets.
 */
describe('canAccessFolderById: every folder above counts too', () => {
  // `A` is shut to `denied`, open to `allowed` (write) and `reader` (read). `B` sits in `A` with
  // no permissions of its own; `C` sits in `B` and gives every member write on its own.
  const everyoneWrites = {
    teams: [],
    members: [
      { uid: 'denied', access: WRITE },
      { uid: 'allowed', access: WRITE },
      { uid: 'reader', access: WRITE },
    ],
  };
  const tree: any = {
    admin: 'admin',
    members: [
      { id: 'admin' },
      { id: 'denied' },
      { id: 'allowed' },
      { id: 'reader' },
    ],
    folders: {
      A: {
        id: 'A',
        parentId: false,
        access: {
          teams: [],
          members: [
            { uid: 'denied', access: NONE },
            { uid: 'allowed', access: WRITE },
            { uid: 'reader', access: READ },
          ],
        },
      },
      B: { id: 'B', parentId: 'A' },
      C: { id: 'C', parentId: 'B', access: everyoneWrites },
      open: { id: 'open', parentId: false },
      openChild: { id: 'openChild', parentId: 'open' },
      loop1: { id: 'loop1', parentId: 'loop2' },
      loop2: { id: 'loop2', parentId: 'loop1' },
      self: { id: 'self', parentId: 'self' },
      orphan: { id: 'orphan', parentId: 'gone' },
    },
    videos: {
      inB: { id: 'inB', refName: 'in-b.mp4', parentId: 'B' },
    },
  };
  const can = (uid: string, folderId: unknown, level: PermissionAccessEnum) =>
    canAccessFolderById(folderId, tree, asUser(uid), level);

  describe('a member shut out of the parent folder', () => {
    it.each([
      ['the parent folder', 'A', READ],
      ['the parent folder', 'A', WRITE],
      ['a subfolder with no permissions', 'B', READ],
      ['a subfolder with no permissions', 'B', WRITE],
      ['a deeper subfolder that grants write', 'C', READ],
      ['a deeper subfolder that grants write', 'C', WRITE],
    ])(
      'is refused on %s (%s, %s)',
      (_label: any, folderId: any, level: any) => {
        expect(can('denied', folderId, level)).toBe(false);
      },
    );

    it('is refused on an item in the subfolder (writing a video by name)', () => {
      expect(canWriteVideoByName(tree, asUser('denied'), 'in-b.mp4')).toBe(
        false,
      );
    });

    it('keeps folders with no permissions anywhere above them', () => {
      expect(can('denied', 'open', WRITE)).toBe(true);
      expect(can('denied', 'openChild', WRITE)).toBe(true);
    });
  });

  describe('a member allowed on the parent folder', () => {
    it.each([
      ['A', READ],
      ['A', WRITE],
      ['B', READ],
      ['B', WRITE],
      ['C', READ],
      ['C', WRITE],
    ])('gets in to %s (%s)', (folderId: any, level: any) => {
      expect(can('allowed', folderId, level)).toBe(true);
    });

    it('may write a video in the subfolder', () => {
      expect(canWriteVideoByName(tree, asUser('allowed'), 'in-b.mp4')).toBe(
        true,
      );
    });
  });

  describe('a member who may only read the parent folder', () => {
    it('reads the subfolders', () => {
      expect(can('reader', 'B', READ)).toBe(true);
      expect(can('reader', 'C', READ)).toBe(true);
    });

    it('may not write in them, even where the subfolder grants write', () => {
      expect(can('reader', 'B', WRITE)).toBe(false);
      expect(can('reader', 'C', WRITE)).toBe(false);
      expect(canWriteVideoByName(tree, asUser('reader'), 'in-b.mp4')).toBe(
        false,
      );
    });
  });

  describe('the workspace admin', () => {
    it.each(['A', 'B', 'C', 'loop1', 'self', 'orphan'])(
      'gets in to %s',
      (folderId: any) => {
        expect(can('admin', folderId, WRITE)).toBe(true);
      },
    );
  });

  describe('broken folder trees are refused', () => {
    it.each([
      ['a loop of two folders', 'loop1'],
      ['a folder that is its own parent', 'self'],
      ['a parent id that matches no folder', 'orphan'],
      ['a folder id that matches no folder', 'gone'],
    ])('%s', (_label: any, folderId: any) => {
      expect(can('allowed', folderId, READ)).toBe(false);
      expect(can('denied', folderId, READ)).toBe(false);
    });
  });

  it.each([undefined, false, 'false', ''])(
    'leaves the workspace root (%p) open',
    (folderId: any) => {
      expect(can('denied', folderId, WRITE)).toBe(true);
    },
  );
});
