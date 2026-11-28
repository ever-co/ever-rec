import {
  workspaceAdminRefusal,
  workspacesAdministeredBy,
} from './workspace-admin';

describe('workspacesAdministeredBy', () => {
  const workspaces: Record<string, { admin?: unknown; name?: unknown }> = {
    'ws-1': { admin: 'uid-1', name: '  Design team  ' },
    'ws-2': { admin: 'uid-2', name: 'Sales' },
    'ws-3': { admin: 'uid-1', name: '   ' },
  };
  const read = jest.fn(async (id: string) => workspaces[id] ?? null);

  beforeEach(() => read.mockClear());

  it('answers the workspaces the account is the admin of, with their names', async () => {
    await expect(
      workspacesAdministeredBy('uid-1', ['ws-1', 'ws-2', 'ws-3'], read),
    ).resolves.toEqual([{ id: 'ws-1', name: 'Design team' }, { id: 'ws-3' }]);
  });

  it('reads each listed workspace once and skips ids that are no database keys or name nothing', async () => {
    await expect(
      workspacesAdministeredBy(
        'uid-1',
        { 0: 'ws-1', 2: 'ws-1', 3: 'a/b', 4: 7, 5: 'gone' },
        read,
      ),
    ).resolves.toEqual([{ id: 'ws-1', name: 'Design team' }]);
    expect(read.mock.calls.map(([id]) => id)).toEqual(['ws-1', 'gone']);
  });

  it('answers none for an account without a list', async () => {
    await expect(
      workspacesAdministeredBy('uid-1', null, read),
    ).resolves.toEqual([]);
    expect(read).not.toHaveBeenCalled();
  });
});

describe('workspaceAdminRefusal', () => {
  it('names one workspace', () => {
    expect(workspaceAdminRefusal([{ id: 'ws-1', name: 'Team' }])).toBe(
      'You are the admin of the workspace “Team”. Before you delete your account, delete that ' +
        'workspace or ask for another member to be made its admin.',
    );
  });

  it('names a workspace without a name by its id', () => {
    expect(workspaceAdminRefusal([{ id: 'ws-1' }])).toContain(
      'the workspace “ws-1”.',
    );
  });

  it('names several, and counts those past the fifth', () => {
    const named = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: `ws-${i + 1}`,
        name: `W${i + 1}`,
      }));

    expect(workspaceAdminRefusal(named(3))).toBe(
      'You are the admin of the workspaces “W1”, “W2” and “W3”. Before you delete your account, ' +
        'delete those workspaces or ask for other members to be made their admins.',
    );
    expect(workspaceAdminRefusal(named(5))).toContain(
      '“W1”, “W2”, “W3”, “W4” and “W5”.',
    );
    expect(workspaceAdminRefusal(named(8))).toContain(
      'the workspaces “W1”, “W2”, “W3”, “W4” and 4 more.',
    );
  });
});
