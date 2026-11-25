/**
 * The neutral counter events of the account paths (see
 * `src/common/events/ever-counters.events.ts`): a user is counted once its creation is complete,
 * and deleting an account subtracts the bytes of its screenshots and videos.
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InMemoryFirebaseApp } from '../../../../test/support/in-memory-firebase';
import {
  EVER_COUNTER_EVENTS,
  EverMediaEvent,
} from '../../../common/events/ever-counters.events';
import { UserProfileService } from './user-profile.service';
import { UserService } from './user.service';

describe('account counter events', () => {
  let firebase: InMemoryFirebaseApp;
  let events: EventEmitter2;
  let usersCreated: number;
  let deleted: EverMediaEvent[];

  const firebaseAdmin = () =>
    ({
      getDatabaseRef: (path: string) => firebase.db.ref(path),
      getStorageBucket: () => firebase.bucket,
    }) as any;

  beforeEach(() => {
    firebase = new InMemoryFirebaseApp();
    events = new EventEmitter2();
    usersCreated = 0;
    deleted = [];
    events.on(EVER_COUNTER_EVENTS.userCreated, () => {
      usersCreated += 1;
    });
    events.on(EVER_COUNTER_EVENTS.mediaDeleted, (event: EverMediaEvent) =>
      deleted.push(event),
    );
  });

  it('counts a user saved by a complete sign-up at once', async () => {
    const users = new UserService(firebaseAdmin(), events);
    await users.addUserToDb({
      uid: 'uid-1',
      email: 'one@example.test',
      emailVerified: true,
    });
    expect(usersCreated).toBe(1);
    // Saved again (already there): not counted twice.
    await users.addUserToDb({
      uid: 'uid-1',
      email: 'one@example.test',
      emailVerified: true,
    });
    expect(usersCreated).toBe(1);
  });

  it('leaves a user out until the caller says its sign-up completed', async () => {
    const users = new UserService(firebaseAdmin(), events);
    await users.addUserToDb(
      { uid: 'uid-2', email: 'two@example.test', emailVerified: true },
      { countCreated: false },
    );
    expect(firebase.db.dump('users/uid-2')).not.toBeNull();
    expect(usersCreated).toBe(0);
    users.countCreatedUser();
    expect(usersCreated).toBe(1);
  });

  it('deleting an account subtracts the bytes of its screenshots and videos', async () => {
    const put = (name: string, size: number) =>
      firebase.bucket.objects.set(name, Buffer.alloc(size, 1));
    put('users/uid-1/screenshots/a.png', 1000);
    put('users/uid-1/screenshots/originals/a.png', 3000);
    put('users/uid-1/videos/v.webm', 7000);
    put('users/uid-1/videosThumbnails/v/c.png', 20);
    put('users/uid-2/videos/kept.webm', 900);
    const profiles = new UserProfileService(firebaseAdmin(), events);

    await profiles.deleteUserFiles('uid-1');

    expect(deleted).toEqual([
      { kind: 'screenshot', bytes: 1000 },
      { kind: 'video', bytes: 7000 },
    ]);
    expect([...firebase.bucket.objects.keys()]).toEqual([
      'users/uid-2/videos/kept.webm',
    ]);
  });
});
