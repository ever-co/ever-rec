/**
 * `TokenStorageService.update` through the real Firebase Admin SDK on the Realtime Database
 * emulator (ever-co/ever-rec#265). A refresh writes the new tokens into the storage entry of its
 * session in one transaction (`applyLocally: false`), so a back-channel logout that deletes the
 * entry meanwhile is never undone (#262). `token-storage.service.spec.ts` checks the same rules
 * against a fake of the SDK and the server.
 *
 * Several Admin apps behave like several API processes: each has its own connection and its own
 * cache, and a new one has read nothing yet (a cold cache).
 */
import { NotFoundException } from '@nestjs/common';
import type * as admin from 'firebase-admin';
import {
  IToken,
  TokenStorageService,
} from '../src/module/auth/services/tokens/token-storage.service';
import { FirebaseAdminService } from '../src/module/firebase/services/firebase-admin.service';
import { emulatorApp } from './setup-emulators';

const SIGNED_IN = 'serialized-at-sign-in';
const REFRESHED = 'serialized-by-the-refresh';
/** Each race runs this many times, on a new entry and new processes, to meet several interleavings. */
const ROUNDS = 5;

type Update = (current: IToken | null) => IToken | null | undefined;

describe('TokenStorageService on the Realtime Database emulator', () => {
  /** The process that signed the person in (stores the entry) and reads the outcome. */
  let signIn: admin.app.App;
  /** The processes a test started; deleted after it. */
  const started: admin.app.App[] = [];

  /** A new API process: nothing read yet, so its cache is cold. */
  const newProcess = (): admin.app.App => {
    const app = emulatorApp();
    started.push(app);
    return app;
  };
  const storageOf = (app: admin.app.App) =>
    new TokenStorageService(new FirebaseAdminService(app));
  const stored = async (id: string): Promise<IToken | null> =>
    (await signIn.database().ref(`tokens/${id}`).get()).val();

  /**
   * The service of `app`, with every value its transaction function is called with recorded, and
   * `afterFirstAttempt` run once, right after the first call: before the SDK sends that attempt to
   * the server, which then compares it with the stored value.
   */
  const observed = (app: admin.app.App, afterFirstAttempt?: () => void) => {
    const attempts: Array<IToken | null> = [];
    const database = app.database();
    const firebaseAdmin = {
      getDatabase: () => ({
        ref: (path: string) => {
          const ref = database.ref(path);
          return {
            transaction: (
              update: Update,
              onComplete?: Parameters<
                admin.database.Reference['transaction']
              >[1],
              applyLocally?: boolean,
            ) =>
              ref.transaction(
                (current: IToken | null) => {
                  attempts.push(current);
                  const next = update(current);
                  if (attempts.length === 1) afterFirstAttempt?.();
                  return next;
                },
                onComplete,
                applyLocally,
              ),
          };
        },
      }),
    } as unknown as FirebaseAdminService;
    return { storage: new TokenStorageService(firebaseAdmin), attempts };
  };

  /**
   * What a refresh racing the logout came to: written before the delete, refused after it, or (same
   * process only) aborted by it: the SDK aborts a pending transaction when a `set()` (here the
   * logout's `remove()`) lands on its location through the same app, and rejects it with
   * `Error('set')`. Any other error fails the race.
   */
  const outcome = (result: PromiseSettledResult<IToken>): string => {
    if (result.status === 'fulfilled') {
      return result.value?.token === REFRESHED
        ? 'written before the logout'
        : `wrote ${JSON.stringify(result.value)}`;
    }
    if (result.reason instanceof NotFoundException) {
      return 'refused after the logout';
    }
    return result.reason instanceof Error && result.reason.message === 'set'
      ? 'aborted by the logout'
      : `failed: ${String(result.reason)}`;
  };
  const RACE_OUTCOMES = [
    'written before the logout',
    'refused after the logout',
    'aborted by the logout',
  ];

  beforeAll(async () => {
    signIn = emulatorApp();
    await signIn.database().ref('tokens').set(null);
  });

  afterEach(async () => {
    await Promise.all(started.splice(0).map((app) => app.delete()));
  });

  afterAll(async () => {
    await signIn.database().ref('tokens').set(null);
    await signIn.delete();
  });

  it('rotates the token of an existing entry from a process with a cold cache', async () => {
    const entry = await storageOf(signIn).save(SIGNED_IN);
    const { storage, attempts } = observed(newProcess());
    const before = Date.now();

    const result = await storage.update(entry.id, REFRESHED);

    // The SDK's first guess is the empty cache; the server has it run again on the stored entry.
    expect(attempts[0]).toBeNull();
    expect(attempts.length).toBeGreaterThanOrEqual(2);
    expect(attempts[attempts.length - 1]).toEqual(entry);
    expect(result).toMatchObject({
      id: entry.id,
      token: REFRESHED,
      createdAt: entry.createdAt,
    });
    expect(result.updatedAt).toBeGreaterThanOrEqual(before);
    expect(await stored(entry.id)).toEqual(result);
  });

  it('refuses an entry that is gone and creates nothing', async () => {
    const entry = await storageOf(signIn).save(SIGNED_IN);
    await signIn.database().ref(`tokens/${entry.id}`).remove();

    await expect(
      storageOf(newProcess()).update(entry.id, REFRESHED),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(await stored(entry.id)).toBeNull();
  });

  it('leaves the entry deleted when delete() races update() in the same process', async () => {
    for (let round = 0; round < ROUNDS; round += 1) {
      const entry = await storageOf(signIn).save(SIGNED_IN);
      const api = storageOf(newProcess());

      // The refresh starts first: its first attempt (on the cold cache) is under way when the
      // logout reads the entry. That read must see the stored entry, not the attempt's guess. The
      // logout's remove() then aborts the pending refresh, unless the server committed it first.
      const [updated, deleted] = await Promise.allSettled([
        api.update(entry.id, REFRESHED),
        api.delete(entry.id),
      ]);

      expect({ round, deleted }).toEqual({
        round,
        deleted: { status: 'fulfilled', value: true },
      });
      expect(RACE_OUTCOMES).toContain(outcome(updated));
      expect({ round, entry: await stored(entry.id) }).toEqual({
        round,
        entry: null,
      });
    }
  });

  it('leaves the entry deleted when delete() in another process races update()', async () => {
    for (let round = 0; round < ROUNDS; round += 1) {
      const entry = await storageOf(signIn).save(SIGNED_IN);
      const logout = storageOf(newProcess());
      let deleting: Promise<boolean> | undefined;
      // The logout starts between the refresh's first attempt and the server's comparison of it.
      const { storage: refresh } = observed(newProcess(), () => {
        deleting = logout.delete(entry.id);
      });

      const [updated] = await Promise.allSettled([
        refresh.update(entry.id, REFRESHED),
      ]);
      const deleted = await Promise.allSettled([deleting]);

      expect({ round, deleted }).toEqual({
        round,
        deleted: [{ status: 'fulfilled', value: true }],
      });
      expect(RACE_OUTCOMES).toContain(outcome(updated));
      expect({ round, entry: await stored(entry.id) }).toEqual({
        round,
        entry: null,
      });
    }
  });
});
