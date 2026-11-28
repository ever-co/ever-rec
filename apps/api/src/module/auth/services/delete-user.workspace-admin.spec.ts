/**
 * `DELETE /api/v1/auth/user` (`AuthOrchestratorService.deleteUser`) refuses while the account is
 * the admin of a workspace, the rule the deletion Ever Platform asks for applies too (`holdFor`):
 * the deletion leaves workspaces as they are, so the workspace would stay without its admin. The
 * refusal names the workspaces and deletes nothing. A member who is not the admin, and an admin
 * once another member was made the admin (or the workspace was deleted), are deleted as before.
 */
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InMemoryFirebaseApp } from '../../../../test/support/in-memory-firebase';
import { ResStatusEnum } from '../../../enums/ResStatusEnum';
import { AuthOrchestratorService } from './auth-orchestrator.service';
import { UserProfileService } from './user-profile.service';
import { UserService } from './user.service';

describe('deleting an account that administers a workspace', () => {
  let firebase: InMemoryFirebaseApp;
  let events: EventEmitter2;
  let failWorkspaceLookup: boolean;

  const firebaseAdmin = () =>
    ({
      getDatabaseRef: (path: string) => {
        const ref = firebase.db.ref(path);
        if (failWorkspaceLookup && path === 'users/uid-1/workspaceIds') {
          ref.get = () => Promise.reject(new Error('database/unavailable'));
        }
        return ref;
      },
      getStorageBucket: () => firebase.bucket,
      deleteUser: (uid: string) => firebase.authService.deleteUser(uid),
    }) as any;

  const removeShared = jest.fn(async () => null);

  const deleteAccount = (uid: string) =>
    new AuthOrchestratorService(
      new UserService(firebaseAdmin(), events),
      {} as any,
      {} as any,
      {} as any,
      new UserProfileService(firebaseAdmin(), events),
      { removeShared } as any,
      events,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    ).deleteUser(uid);

  /** Nothing of uid-1 was deleted: its sign-in account, its record, its files, its shares. */
  const expectNothingDeleted = () => {
    expect(firebase.authService.users.has('uid-1')).toBe(true);
    expect(firebase.db.dump('users/uid-1')).toMatchObject({
      email: 'one@example.test',
    });
    expect([...firebase.bucket.objects.keys()]).toContain(
      'users/uid-1/screenshots/a.png',
    );
    expect(removeShared).not.toHaveBeenCalled();
  };

  beforeEach(async () => {
    firebase = new InMemoryFirebaseApp();
    events = new EventEmitter2();
    failWorkspaceLookup = false;
    removeShared.mockClear();

    firebase.authService.addUser({ uid: 'uid-1', email: 'one@example.test' });
    firebase.authService.addUser({ uid: 'uid-2', email: 'two@example.test' });
    await firebase.db.ref('users/uid-1').set({
      email: 'one@example.test',
      displayName: 'One',
      workspaceIds: ['ws-1', 'ws-2'],
      screenshots: { s1: { title: 'a', refName: 'a.png' } },
    });
    await firebase.db.ref('users/uid-2').set({
      email: 'two@example.test',
      displayName: 'Two',
      workspaceIds: ['ws-1', 'ws-2'],
    });
    // uid-1 is the admin of ws-1 and only a member of ws-2.
    await firebase.db.ref('workspaces/ws-1').set({
      id: 'ws-1',
      name: 'Design team',
      admin: 'uid-1',
      members: [{ id: 'uid-1' }, { id: 'uid-2' }],
      screenshots: { s9: { uid: 'uid-2', refName: 'z.png', title: 'z' } },
    });
    await firebase.db.ref('workspaces/ws-2').set({
      id: 'ws-2',
      name: 'Sales',
      admin: 'uid-2',
      members: [{ id: 'uid-2' }, { id: 'uid-1' }],
    });
    firebase.bucket.objects.set(
      'users/uid-1/screenshots/a.png',
      Buffer.alloc(10, 1),
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('is refused while the account is the admin, naming the workspace, and deletes nothing', async () => {
    const workspaceBefore = firebase.db.dump('workspaces/ws-1');

    const result = await deleteAccount('uid-1');

    expect(result.status).toBe(ResStatusEnum.error);
    expect(result.message).toBe(
      'You are the admin of the workspace “Design team”. Delete that workspace before you ' +
        'delete your account.',
    );
    // Only the workspace it administers, not the one it is a member of.
    expect(result.error).toEqual({
      code: 'workspace_admin',
      workspaces: [{ id: 'ws-1', name: 'Design team' }],
    });
    expectNothingDeleted();
    expect(firebase.db.dump('workspaces/ws-1')).toEqual(workspaceBefore);
  });

  it('names every workspace the account is the admin of', async () => {
    await firebase.db.ref('workspaces/ws-2/admin').set('uid-1');

    const result = await deleteAccount('uid-1');

    expect(result.status).toBe(ResStatusEnum.error);
    expect(result.message).toBe(
      'You are the admin of the workspaces “Design team” and “Sales”. Delete those workspaces ' +
        'before you delete your account.',
    );
    expect(result.error).toEqual({
      code: 'workspace_admin',
      workspaces: [
        { id: 'ws-1', name: 'Design team' },
        { id: 'ws-2', name: 'Sales' },
      ],
    });
    expectNothingDeleted();
  });

  it('finds the workspace in a list stored as an object (an array with a hole)', async () => {
    await firebase.db.ref('users/uid-1/workspaceIds').set({ 1: 'ws-1' });

    const result = await deleteAccount('uid-1');

    expect(result.status).toBe(ResStatusEnum.error);
    expect(result.error).toMatchObject({ code: 'workspace_admin' });
    expectNothingDeleted();
  });

  it('finds a workspace that names the account as its admin though its own list does not', async () => {
    // As an admin who left their workspace before that was refused, or a workspace deletion that
    // took the id out of the list and then failed to remove the workspace.
    await firebase.db.ref('users/uid-1/workspaceIds').set(['ws-2']);

    const result = await deleteAccount('uid-1');

    expect(result.status).toBe(ResStatusEnum.error);
    expect(result.error).toEqual({
      code: 'workspace_admin',
      workspaces: [{ id: 'ws-1', name: 'Design team' }],
    });
    expectNothingDeleted();
  });

  it('is allowed once another member was made the admin', async () => {
    await firebase.db.ref('workspaces/ws-1/admin').set('uid-2');

    const result = await deleteAccount('uid-1');

    expect(result.status).toBe(ResStatusEnum.success);
    expect(firebase.authService.users.has('uid-1')).toBe(false);
    expect(firebase.db.dump('users/uid-1')).toBeNull();
    // The workspaces stay as they are, with their admins.
    expect(firebase.db.dump('workspaces/ws-1/admin')).toBe('uid-2');
    expect(firebase.db.dump('workspaces/ws-2/admin')).toBe('uid-2');
  });

  it('is allowed once the workspace was deleted, even with its id still listed', async () => {
    await firebase.db.ref('workspaces/ws-1').remove();

    const result = await deleteAccount('uid-1');

    expect(result.status).toBe(ResStatusEnum.success);
    expect(firebase.authService.users.has('uid-1')).toBe(false);
    expect(firebase.db.dump('users/uid-1')).toBeNull();
  });

  it('is allowed for an account that is only a member of its workspaces', async () => {
    // uid-2 is a member of ws-1 (admin uid-1), and of ws-2 once that has another admin.
    await firebase.db.ref('workspaces/ws-2/admin').set('uid-3');
    const workspacesBefore = firebase.db.dump('workspaces');

    const result = await deleteAccount('uid-2');

    expect(result.status).toBe(ResStatusEnum.success);
    expect(firebase.authService.users.has('uid-2')).toBe(false);
    expect(firebase.db.dump('users/uid-2')).toBeNull();
    expect(firebase.db.dump('workspaces')).toEqual(workspacesBefore);
    expect(firebase.db.dump('users/uid-1')).toMatchObject({
      email: 'one@example.test',
    });
  });

  it('is allowed for an account without workspaces', async () => {
    await firebase.db.ref('users/uid-1/workspaceIds').remove();
    await firebase.db.ref('workspaces/ws-1/admin').set('uid-2');

    const result = await deleteAccount('uid-1');

    expect(result.status).toBe(ResStatusEnum.success);
    expect(firebase.db.dump('users/uid-1')).toBeNull();
  });

  it('fails, deleting nothing, when the workspaces cannot be read', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    failWorkspaceLookup = true;

    const result = await deleteAccount('uid-1');

    expect(result.status).toBe(ResStatusEnum.error);
    expect(result.message).toBe(
      'Error while trying to delete user or user files!',
    );
    expectNothingDeleted();
  });
});
