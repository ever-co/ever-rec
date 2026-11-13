/**
 * `evaluateAccess` decides whether a workspace member may use an image, video or folder at a given
 * level. When the permissions listed teams only, it used to answer "yes" to every member as soon
 * as the workspace had any team. These tests pin the answers for each shape of permissions.
 */
import { evaluateAccess } from './utils';
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
      ['a member of the listed team, higher level asked', 'in-t1', ADMIN, false],
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
      expect(
        !!evaluateAccess(denied, workspace, asUser('in-t1'), READ),
      ).toBe(false);
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
