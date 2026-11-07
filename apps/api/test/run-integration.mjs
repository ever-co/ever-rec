/**
 * `npm run test:integration [-- <jest arguments>]`: the integration suites against the Firebase
 * Emulator Suite (Authentication, Realtime Database, Storage).
 *
 * With `FIREBASE_DATABASE_EMULATOR_HOST` already set (emulators running, for example the
 * `tools/egress-audit/emulators.Dockerfile` image), Jest runs directly. Otherwise the emulators of
 * the repository's `firebase.json` are started around the run with
 * `firebase emulators:exec --only auth,database,storage` (the Firebase CLI must be installed, with
 * Java 17 or later).
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const api = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const project = process.env.GCLOUD_PROJECT || 'demo-ever-rec';
const jest = [
  'jest',
  '--config',
  './test/jest-integration.json',
  '--runInBand',
  ...args,
];

let result;
if (process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
  // The developer's own tools (npx, the Firebase CLI), from their PATH: a test runner, not the API.
  const options = {
    cwd: api,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  };
  result = spawnSync('npx', jest, options); // NOSONAR: the developer's own npx, from their PATH
} else {
  const quoted = jest
    .map((part) => (/^[\w./:=@-]+$/.test(part) ? part : JSON.stringify(part)))
    .join(' ');
  result = spawnSync(
    'firebase', // NOSONAR: the developer's Firebase CLI, from their PATH
    [
      'emulators:exec',
      '--config',
      '../../firebase.json',
      '--only',
      'auth,database,storage',
      '--project',
      project,
      `npx ${quoted}`,
    ],
    {
      cwd: api,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, GCLOUD_PROJECT: project },
    },
  );
}
if (result.error) {
  console.error(result.error.message);
  process.exit(2);
}
process.exit(result.status ?? 1);
