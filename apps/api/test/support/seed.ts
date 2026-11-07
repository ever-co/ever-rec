/** The seeded test project (`test/fixtures/generate-seed.mjs`), loaded into the in-memory doubles. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { InMemoryFirebaseApp } from './in-memory-firebase';

const SEED_DIR = join(__dirname, '..', 'fixtures');

/** Loads the seeded project (users, workspaces, teams, stored objects) into the in-memory doubles. */
export function seedInMemory(firebase: InMemoryFirebaseApp) {
  const seed = JSON.parse(readFileSync(join(SEED_DIR, 'rtdb-seed.json'), 'utf8'));
  const auth = JSON.parse(readFileSync(join(SEED_DIR, 'auth-seed.json'), 'utf8'));
  firebase.db.write([], seed);
  for (const user of auth.users) {
    firebase.authService.addUser({ uid: user.uid, email: user.email, displayName: user.displayName, emailVerified: true });
  }
  const storage = JSON.parse(readFileSync(join(SEED_DIR, 'storage-seed.json'), 'utf8'));
  for (const object of storage.objects) {
    firebase.bucket.objects.set(object.name, Buffer.alloc(object.size, 1));
  }
  return { seed, auth, storage };
}


/** Every identifying string of the seed. */
export function canaryValues(): string[] {
  return JSON.parse(readFileSync(join(SEED_DIR, 'canary-values.json'), 'utf8')).values;
}
