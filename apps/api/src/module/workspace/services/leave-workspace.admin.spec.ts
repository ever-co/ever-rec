/**
 * A workspace's admin cannot leave it (`DELETE /workspaces/:id/leave`). Leaving took the workspace
 * out of the admin's own list `users/<uid>/workspaceIds` and kept `admin`, so the account deletion,
 * which finds the workspaces an account administers through that list, then deleted the admin and
 * left the workspace without one. A member still leaves as before.
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InMemoryFirebaseApp } from '../../../../test/support/in-memory-firebase';
import { ResStatusEnum } from '../../../enums/ResStatusEnum';
import { AuthOrchestratorService } from '../../auth/services/auth-orchestrator.service';
import { UserProfileService } from '../../auth/services/user-profile.service';
import { UserService } from '../../auth/services/user.service';
import { WorkspaceUtilitiesService } from './utilities.service';
import { WorkspacesService } from './workspace.service';

let mockFirebase: InMemoryFirebaseApp;

jest.mock('firebase-admin', () => ({
  ...jest.requireActual('firebase-admin'),
  database: () => mockFirebase.database(),
  storage: () => mockFirebase.storage(),
}));

// Image resizing is not under test; this keeps the native module from loading.
jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }));

describe('leaving a workspace as its admin', () => {
  let events: EventEmitter2;

  const workspaces = () =>
    new WorkspacesService(new WorkspaceUtilitiesService(), {} as any, events);

  const deleteAccount = (uid: string) => {
    const firebaseAdmin = {
      getDatabaseRef: (path: string) => mockFirebase.db.ref(path),
      getStorageBucket: () => mockFirebase.bucket,
      deleteUser: (id: string) => mockFirebase.authService.deleteUser(id),
    } as any;
    return new AuthOrchestratorService(
      new UserService(firebaseAdmin, events),
      {} as any,
      {} as any,
      {} as any,
      new UserProfileService(firebaseAdmin, events),
      { removeShared: async () => null } as any,
      events,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    ).deleteUser(uid);
  };

  beforeEach(async () => {
    mockFirebase = new InMemoryFirebaseApp();
    events = new EventEmitter2();
    mockFirebase.authService.addUser({
      uid: 'uid-admin',
      email: 'admin@example.test',
    });
    mockFirebase.authService.addUser({
      uid: 'uid-member',
      email: 'member@example.test',
    });
    await mockFirebase.db.ref('users/uid-admin').set({
      email: 'admin@example.test',
      workspaceIds: ['ws-1'],
    });
    await mockFirebase.db.ref('users/uid-member').set({
      email: 'member@example.test',
      workspaceIds: ['ws-1'],
    });
    await mockFirebase.db.ref('workspaces/ws-1').set({
      id: 'ws-1',
      name: 'Team',
      admin: 'uid-admin',
      members: [{ id: 'uid-admin' }, { id: 'uid-member' }],
      teams: [],
    });
  });

  it('is refused, and the workspace and the admin’s list stay as they are', async () => {
    const before = mockFirebase.db.dump();

    const result = await workspaces().leaveWorkspace('uid-admin', 'ws-1');

    expect(result.status).toBe(ResStatusEnum.error);
    expect(result.message).toBe(
      'The admin of a workspace cannot leave it. Delete the workspace instead.',
    );
    expect(mockFirebase.db.dump()).toEqual(before);
  });

  it('so the account deletion still finds the workspace and refuses', async () => {
    await workspaces().leaveWorkspace('uid-admin', 'ws-1');

    const result = await deleteAccount('uid-admin');

    expect(result.status).toBe(ResStatusEnum.error);
    expect(result.error).toMatchObject({ code: 'workspace_admin' });
    expect(mockFirebase.authService.users.has('uid-admin')).toBe(true);
    expect(mockFirebase.db.dump('workspaces/ws-1/admin')).toBe('uid-admin');
  });

  it('a member still leaves', async () => {
    const result = await workspaces().leaveWorkspace('uid-member', 'ws-1');

    expect(result.status).toBe(ResStatusEnum.success);
    expect(mockFirebase.db.dump('workspaces/ws-1/members')).toEqual([
      { id: 'uid-admin' },
    ]);
    // An empty list is stored as no list.
    expect(mockFirebase.db.dump('users/uid-member/workspaceIds') ?? []).toEqual(
      [],
    );
  });
});
