import type * as admin from 'firebase-admin';
import { clearEmulators, emulatorApp, seedEmulators } from './setup-emulators';

describe('Firebase emulators and the seeded project', () => {
  let app: admin.app.App;

  beforeAll(async () => {
    app = emulatorApp();
    await clearEmulators(app);
  });

  afterAll(async () => {
    await app.delete();
  });

  it('loads the seed and reads back 42 users, 6 workspaces and 9 teams', async () => {
    const summary = await seedEmulators(app);
    expect(summary).toMatchObject({ users: 42, workspaces: 6, teams: 9 });
    const page = await app.auth().listUsers(1000);
    expect(page.users).toHaveLength(42);
    const workspaces = (await app.database().ref('workspaces').get()).val();
    expect(Object.keys(workspaces)).toHaveLength(6);
    const [files] = await app.storage().bucket().getFiles();
    expect(files.length).toBeGreaterThan(50);
  });
});
