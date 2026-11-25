/**
 * `DELETE /api/v1/auth/user` (`AuthOrchestratorService.deleteUser`): deleting an account removes
 * its database record `users/<uid>`, which holds the email, the display name, the screenshot and
 * video records and the stored OAuth tokens (Google Drive, Dropbox, Jira). The record goes only
 * once the shares, the files and the sign-in account are gone, and workspaces, shares and the
 * data of other users stay as they are. The Ever ID links of the account (`ever_identities/<key>`,
 * which holds the e-mail, the Ever ID subject and the person id, and `ever_identities_by_uid/<uid>`)
 * go too, removed by the Ever ID module's handler of the deleted-account event.
 */
import { Logger } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { InMemoryFirebaseApp } from '../../../../test/support/in-memory-firebase';
import { EVER_COUNTER_EVENTS } from '../../../common/events/ever-counters.events';
import { ResStatusEnum } from '../../../enums/ResStatusEnum';
import { EverIdAccountDeletedListener } from '../../ever-id/services/ever-id-account-deleted.listener';
import { EverIdLinkService } from '../../ever-id/services/ever-id-link.service';
import { FirebaseAdminService } from '../../firebase/services/firebase-admin.service';
import { AuthOrchestratorService } from './auth-orchestrator.service';
import { UserProfileService } from './user-profile.service';
import { UserService } from './user.service';

describe('deleting an account', () => {
  let firebase: InMemoryFirebaseApp;
  let events: EventEmitter2;
  let everId: TestingModule;
  let links: EverIdLinkService;
  let failAuthDeletion: boolean;
  let failRecordRemoval: boolean;
  let failLinkLookup: boolean;

  const firebaseAdmin = () =>
    ({
      getDatabaseRef: (path: string) => {
        const ref = firebase.db.ref(path);
        if (failRecordRemoval && path === 'users/uid-1') {
          ref.remove = () => Promise.reject(new Error('database/unavailable'));
        }
        if (failLinkLookup && path === 'ever_identities_by_uid/uid-1') {
          ref.get = () => Promise.reject(new Error('database/unavailable'));
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
    // The app's event bus with the Ever ID module's handler of a deleted account, as wired by Nest.
    everId = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        { provide: FirebaseAdminService, useValue: firebaseAdmin() },
        EverIdLinkService,
        EverIdAccountDeletedListener,
      ],
    }).compile();
    await everId.init();
    events = everId.get(EventEmitter2);
    links = everId.get(EverIdLinkService);
    failAuthDeletion = false;
    failRecordRemoval = false;
    failLinkLookup = false;
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
    // uid-1 signs in with two Ever IDs, uid-2 with one.
    await links.link({
      issuer: 'https://id.example.test',
      subject: 'subject-one',
      uid: 'uid-1',
      everPersonId: 'person-one',
      emailAtLink: 'one@example.test',
      linkMethod: 'jit',
    });
    await links.link({
      issuer: 'https://other-id.example.test',
      subject: 'subject-one',
      uid: 'uid-1',
      emailAtLink: 'one@example.test',
      linkMethod: 'explicit',
    });
    await links.link({
      issuer: 'https://id.example.test',
      subject: 'subject-two',
      uid: 'uid-2',
      everPersonId: 'person-two',
      emailAtLink: 'two@example.test',
      linkMethod: 'jit',
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await everId.close();
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

  it('removes the Ever ID links of the account and keeps those of other users', async () => {
    const result = await orchestrator().deleteUser('uid-1');

    expect(result.status).toBe(ResStatusEnum.success);
    const remaining = Object.values(
      (firebase.db.dump('ever_identities') ?? {}) as Record<
        string,
        { uid: string }
      >,
    );
    expect(remaining.map((link) => link.uid)).toEqual(['uid-2']);
    expect(firebase.db.dump('ever_identities_by_uid/uid-1')).toBeNull();
    await expect(links.listForUser('uid-2')).resolves.toEqual([
      expect.objectContaining({ subject: 'subject-two' }),
    ]);
    // Nothing in the database holds the e-mail address of the deleted account any more.
    expect(JSON.stringify(firebase.db.dump())).not.toContain(
      'one@example.test',
    );
  });

  it('logs a failure to remove the Ever ID links and still deletes the account', async () => {
    const logged = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    failLinkLookup = true;

    const result = await orchestrator().deleteUser('uid-1');

    expect(result.status).toBe(ResStatusEnum.success);
    expect(firebase.authService.users.has('uid-1')).toBe(false);
    expect(firebase.db.dump('users/uid-1')).toBeNull();
    expect(logged).toHaveBeenCalledWith(
      expect.stringContaining('ever_id.link result=removal_failed'),
      expect.anything(),
    );
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
    // The account can still sign in with its Ever IDs.
    await expect(links.listForUser('uid-1')).resolves.toHaveLength(2);
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
