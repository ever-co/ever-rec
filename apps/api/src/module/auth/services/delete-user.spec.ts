/**
 * `DELETE /api/v1/auth/user` (`AuthOrchestratorService.deleteUser`): deleting an account removes
 * its database record `users/<uid>`, which holds the email, the display name, the screenshot and
 * video records and the stored OAuth tokens (Google Drive, Dropbox, Jira). The record goes only
 * once the shares, the files and the sign-in account are gone, and workspaces, shares and the
 * data of other users stay as they are.
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InMemoryFirebaseApp } from '../../../../test/support/in-memory-firebase';
import { EVER_COUNTER_EVENTS } from '../../../common/events/ever-counters.events';
import { ResStatusEnum } from '../../../enums/ResStatusEnum';
import { AuthOrchestratorService } from './auth-orchestrator.service';
import { UserProfileService } from './user-profile.service';
import { UserService } from './user.service';

describe('deleting an account', () => {
  let firebase: InMemoryFirebaseApp;
  let events: EventEmitter2;
  let failAuthDeletion: boolean;
  let failRecordRemoval: boolean;

  const firebaseAdmin = () =>
    ({
      getDatabaseRef: (path: string) => {
        const ref = firebase.db.ref(path);
        if (failRecordRemoval && path === 'users/uid-1') {
          ref.remove = () => Promise.reject(new Error('database/unavailable'));
        }
        return ref;
      },
      getStorageBucket: () => firebase.bucket,
      deleteUser: async (uid: string) => {
        if (failAuthDeletion) {
          throw new Error('auth/internal-error');
        }
        // As the Admin SDK does for an account that is already gone.
        if (!firebase.authService.users.has(uid)) {
          throw Object.assign(new Error('There is no user record.'), {
            code: 'auth/user-not-found',
          });
        }
        await firebase.authService.deleteUser(uid);
      },
    }) as any;

  const removeShared = jest.fn(async () => null);

  const orchestrator = () =>
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
    );

  beforeEach(async () => {
    firebase = new InMemoryFirebaseApp();
    events = new EventEmitter2();
    failAuthDeletion = false;
    failRecordRemoval = false;
    removeShared.mockClear();

    firebase.authService.addUser({ uid: 'uid-1', email: 'one@example.test' });
    firebase.authService.addUser({ uid: 'uid-2', email: 'two@example.test' });
    await firebase.db.ref('users/uid-1').set({
      email: 'one@example.test',
      displayName: 'One',
      googleAPISCredentials: {
        credentials: {
          access_token: 'access-one',
          refresh_token: 'refresh-one',
          expiry_date: 1,
        },
        email: 'one@example.test',
      },
      dropboxAPICredentials: { credentials: { refresh_token: 'dbx-one' } },
      screenshots: { s1: { title: 'a', refName: 'a.png' } },
      videos: { v1: { title: 'v', refName: 'v.webm' } },
    });
    await firebase.db.ref('users/uid-2').set({
      email: 'two@example.test',
      displayName: 'Two',
      screenshots: { s2: { title: 'b', refName: 'b.png' } },
    });
    await firebase.db.ref('workspaces/ws-1').set({
      name: 'Team',
      admin: 'uid-2',
      members: [{ id: 'uid-2' }, { id: 'uid-1' }],
    });
    await firebase.db.ref('shared/share-2').set({ uid: 'uid-2' });
    firebase.bucket.objects.set(
      'users/uid-1/screenshots/a.png',
      Buffer.alloc(10, 1),
    );
    firebase.bucket.objects.set(
      'users/uid-2/screenshots/b.png',
      Buffer.alloc(10, 1),
    );
  });

  it('removes the record users/<uid> with its stored OAuth tokens', async () => {
    const result = await orchestrator().deleteUser('uid-1');

    expect(result.status).toBe(ResStatusEnum.success);
    expect(removeShared).toHaveBeenCalledWith('uid-1');
    expect(firebase.authService.users.has('uid-1')).toBe(false);
    expect([...firebase.bucket.objects.keys()]).toEqual([
      'users/uid-2/screenshots/b.png',
    ]);
    expect(firebase.db.dump('users/uid-1')).toBeNull();
  });

  it('leaves workspaces, shares and the data of other users unchanged', async () => {
    const before = {
      user: firebase.db.dump('users/uid-2'),
      workspace: firebase.db.dump('workspaces/ws-1'),
      shared: firebase.db.dump('shared'),
    };

    await orchestrator().deleteUser('uid-1');

    expect(firebase.db.dump('users/uid-2')).toEqual(before.user);
    expect(firebase.db.dump('workspaces/ws-1')).toEqual(before.workspace);
    expect(firebase.db.dump('shared')).toEqual(before.shared);
    expect(firebase.authService.users.has('uid-2')).toBe(true);
  });

  it('keeps the record when the sign-in account could not be deleted', async () => {
    failAuthDeletion = true;

    const result = await orchestrator().deleteUser('uid-1');

    expect(result.status).toBe(ResStatusEnum.error);
    expect(firebase.authService.users.has('uid-1')).toBe(true);
    expect(firebase.db.dump('users/uid-1')).toMatchObject({
      email: 'one@example.test',
      googleAPISCredentials: {
        credentials: { refresh_token: 'refresh-one' },
      },
    });
  });

  it('a retry removes the record when the first attempt deleted only the sign-in account', async () => {
    const deletedEvents: unknown[] = [];
    events.on(EVER_COUNTER_EVENTS.userDeleted, (event) =>
      deletedEvents.push(event),
    );

    failRecordRemoval = true;
    const first = await orchestrator().deleteUser('uid-1');

    expect(first.status).toBe(ResStatusEnum.error);
    expect(firebase.authService.users.has('uid-1')).toBe(false);
    expect(firebase.db.dump('users/uid-1')).not.toBeNull();

    failRecordRemoval = false;
    const retry = await orchestrator().deleteUser('uid-1');

    expect(retry.status).toBe(ResStatusEnum.success);
    expect(firebase.db.dump('users/uid-1')).toBeNull();
    expect(deletedEvents).toHaveLength(1);
  });
});
