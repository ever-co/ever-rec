/**
 * The Firebase Emulator Suite for the integration suites (`*.integration-spec.ts`).
 *
 * `npm run test:integration` starts the emulators of `firebase.json` with `firebase emulators:exec`
 * (or uses running ones when `FIREBASE_DATABASE_EMULATOR_HOST` is already set) and runs the suites
 * against them through the real Firebase Admin SDK. The project id starts with `demo-`, which the
 * emulators keep fully local: nothing reaches a real Firebase project.
 */
import * as admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const EMULATOR_PROJECT = process.env.GCLOUD_PROJECT || 'demo-ever-rec';

const FIXTURES = join(__dirname, 'fixtures');

/** Throws unless the three emulators are configured. */
export function requireEmulators(): void {
  const missing = [
    'FIREBASE_AUTH_EMULATOR_HOST',
    'FIREBASE_DATABASE_EMULATOR_HOST',
    'FIREBASE_STORAGE_EMULATOR_HOST',
  ].filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(
      `The integration suites run against the Firebase emulators: ${missing.join(', ')} not set. Use npm run test:integration.`,
    );
  }
}

let counter = 0;

/** A Firebase Admin app on the emulators; several of them behave like several API processes. */
export function emulatorApp(
  name = `emulator-${(counter += 1)}`,
): admin.app.App {
  requireEmulators();
  return admin.initializeApp(
    {
      projectId: EMULATOR_PROJECT,
      databaseURL: `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}?ns=${EMULATOR_PROJECT}`,
      storageBucket: `${EMULATOR_PROJECT}.appspot.com`,
    },
    name,
  );
}

/** Empties the Realtime Database, the users and the bucket. */
export async function clearEmulators(app: admin.app.App): Promise<void> {
  await app.database().ref().set(null);
  let pageToken: string | undefined;
  do {
    const page = await app.auth().listUsers(1000, pageToken);
    if (page.users.length)
      await app.auth().deleteUsers(page.users.map((user) => user.uid));
    pageToken = page.pageToken;
  } while (pageToken);
  const [files] = await app.storage().bucket().getFiles();
  await Promise.all(files.map((file) => file.delete()));
}

export interface SeedSummary {
  users: number;
  workspaces: number;
  teams: number;
  storageBytes: number;
}

/** Loads the seeded project (`fixtures/generate-seed.mjs`) into the emulators. */
export async function seedEmulators(app: admin.app.App): Promise<SeedSummary> {
  const seed = JSON.parse(
    readFileSync(join(FIXTURES, 'rtdb-seed.json'), 'utf8'),
  );
  const auth = JSON.parse(
    readFileSync(join(FIXTURES, 'auth-seed.json'), 'utf8'),
  );
  const storage = JSON.parse(
    readFileSync(join(FIXTURES, 'storage-seed.json'), 'utf8'),
  );
  await app.database().ref().set(seed);
  await app.auth().importUsers(
    auth.users.map(
      (user: { uid: string; email: string; displayName: string }) => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: true,
      }),
    ),
  );
  const bucket = app.storage().bucket();
  for (const object of storage.objects as Array<{
    name: string;
    size: number;
  }>) {
    await bucket
      .file(object.name)
      .save(Buffer.alloc(object.size, 7), { resumable: false });
  }
  const workspaces = Object.values(seed.workspaces ?? {}) as Array<{
    teams?: unknown[];
  }>;
  return {
    users: auth.users.length,
    workspaces: workspaces.length,
    teams: workspaces.reduce((sum, ws) => sum + (ws.teams?.length ?? 0), 0),
    storageBytes: storage.objects.reduce(
      (sum: number, o: { size: number }) => sum + o.size,
      0,
    ),
  };
}
