/**
 * `populateWorkspaceMembers` turns the member ids of a workspace into display rows. A member whose
 * user record is gone, or a workspace stored without members, must not fail the whole list.
 */
import { IUser } from '../../../interfaces/IUser';
import { IWorkspace } from '../Interfaces/Workspace';
import { WorkspaceMembersService } from './members.service';

// The utilities service is only a constructor dependency here; this keeps its imports out.
jest.mock('./utilities.service', () => ({ WorkspaceUtilitiesService: class {} }));

const workspaceWith = (members: unknown): IWorkspace =>
  ({ id: 'w1', members }) as unknown as IWorkspace;

const usersByUid = (users: Record<string, Partial<IUser>>): IUser[] =>
  users as unknown as IUser[];

describe('WorkspaceMembersService.populateWorkspaceMembers', () => {
  const service = new WorkspaceMembersService(null as never);

  it('fills the profile of each member from the users collection', () => {
    const result = service.populateWorkspaceMembers(
      workspaceWith([{ id: 'a' }, { id: 'b' }]),
      usersByUid({
        a: { displayName: 'Ada', email: 'ada@example.com', photoURL: 'p.png' },
        b: { displayName: 'Bob', email: 'bob@example.com' },
      }),
    );

    expect(result).toEqual([
      {
        id: 'a',
        displayName: 'Ada',
        email: 'ada@example.com',
        photoURL: 'p.png',
      },
      {
        id: 'b',
        displayName: 'Bob',
        email: 'bob@example.com',
        photoURL: undefined,
      },
    ]);
  });

  it('keeps the placeholders for a member with an empty profile', () => {
    const result = service.populateWorkspaceMembers(
      workspaceWith([{ id: 'a' }]),
      usersByUid({ a: {} }),
    );

    expect(result).toEqual([
      {
        id: 'a',
        displayName: 'Anonymous',
        email: 'No Email',
        photoURL: undefined,
      },
    ]);
  });

  it('still lists the other members when one has no user record', () => {
    const result = service.populateWorkspaceMembers(
      workspaceWith([{ id: 'gone' }, { id: 'a' }]),
      usersByUid({ a: { displayName: 'Ada', email: 'ada@example.com' } }),
    );

    expect(result.map((m) => m.id)).toEqual(['gone', 'a']);
    expect(result[0]).toEqual({
      id: 'gone',
      displayName: 'Anonymous',
      email: 'No Email',
      photoURL: undefined,
    });
    expect(result[1].displayName).toBe('Ada');
  });

  it('copes with no users collection at all', () => {
    const result = service.populateWorkspaceMembers(
      workspaceWith([{ id: 'a' }]),
      null as unknown as IUser[],
    );

    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('Anonymous');
  });

  it('returns an empty list for a workspace stored without members', () => {
    expect(
      service.populateWorkspaceMembers(workspaceWith(undefined), usersByUid({})),
    ).toEqual([]);
    expect(
      service.populateWorkspaceMembers(workspaceWith(null), usersByUid({})),
    ).toEqual([]);
  });

  it('accepts members that Firebase returned as an object', () => {
    const result = service.populateWorkspaceMembers(
      workspaceWith({ 0: { id: 'a' }, 2: { id: 'b' } }),
      usersByUid({ a: { displayName: 'Ada' }, b: { displayName: 'Bob' } }),
    );

    expect(result.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('keeps the page window: 20 by default, and the next 20 for limit 40', () => {
    const members = Array.from({ length: 45 }, (_, i) => ({ id: `u${i}` }));
    const workspace = workspaceWith(members);

    const first = service.populateWorkspaceMembers(workspace, usersByUid({}));
    const second = service.populateWorkspaceMembers(
      workspace,
      usersByUid({}),
      40,
    );

    expect(first).toHaveLength(20);
    expect(first[0].id).toBe('u0');
    expect(second).toHaveLength(20);
    expect(second[0].id).toBe('u20');
    expect(second[19].id).toBe('u39');
  });

  describe('a limit that does not fall on a page boundary', () => {
    const workspace = workspaceWith(
      Array.from({ length: 45 }, (_, i) => ({ id: `u${i}` })),
    );
    const ids = (limit: number | string | undefined) =>
      service
        .populateWorkspaceMembers(workspace, usersByUid({}), limit)
        .map((m) => m.id);

    it('lists the first members for a limit under 20, not an empty page', () => {
      expect(ids(5)).toEqual(['u0', 'u1', 'u2', 'u3', 'u4']);
      expect(ids(1)).toEqual(['u0']);
      expect(ids(19)).toHaveLength(19);
    });

    it('keeps the first 20 members for a limit of exactly 20', () => {
      expect(ids(20)).toHaveLength(20);
      expect(ids(20)[0]).toBe('u0');
    });

    it('keeps the window of the 20 before the limit, as before, for 21 to 45', () => {
      expect(ids(30)[0]).toBe('u10');
      expect(ids(30)).toHaveLength(20);
      expect(ids(45)[0]).toBe('u25');
      expect(ids('40')[0]).toBe('u20');
    });

    it('returns the last members and then nothing once the limit is past the list', () => {
      expect(ids(60)).toEqual(
        Array.from({ length: 5 }, (_, i) => `u${40 + i}`),
      );
      expect(ids(100)).toEqual([]);
    });

    it.each([0, -5, -40, NaN, 'abc', undefined])(
      'falls back to the first 20 members for %p',
      (limit) => {
        const result = ids(limit as number | string | undefined);
        expect(result).toHaveLength(20);
        expect(result[0]).toBe('u0');
      },
    );
  });
});
