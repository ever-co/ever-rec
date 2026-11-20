/**
 * Builds the auth part of the API plus the optional Ever Platform modules (exactly as `AppModule`
 * decides from the environment) on top of the in-memory Firebase doubles, with a controllable
 * clock and the in-process {@link FakeEverPlatform} as the only way out. The scheduler's timers are
 * not started: tests drive it.
 */
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { isEverConnectEnabled } from '../../src/common/ever-platform/env';
import { everPlatformModules } from '../../src/common/ever-platform/modules';
import { AuthModule } from '../../src/module/auth/auth.module';
import {
  EVER_CONNECT_AUTOSTART,
  EVER_CONNECT_CLOCK,
  EVER_CONNECT_FETCH,
  EVER_CONNECT_LOCAL_PLATFORM,
  EVER_CONNECT_WORKSPACE_CREATOR,
} from '../../src/module/ever-connect/ever-connect.tokens';
import { FIREBASE_ADMIN } from '../../src/module/firebase/firebase.constants';
import { FirebaseModule } from '../../src/module/firebase/firebase.module';
import { FirebaseRestService } from '../../src/module/firebase/services/firebase-rest.service';
import {
  FAKE_PLATFORM_ISSUER,
  FAKE_PLATFORM_URL,
  FakeEverPlatform,
} from './fake-ever-platform';
import { InMemoryFirebaseApp, InMemoryIdentityToolkit } from './in-memory-firebase';
import { BASE_ENV } from './test-app';

/** Every variable the Ever Platform modules read, cleared so the host environment cannot leak in. */
export const EVER_CONNECT_VARIABLES = [
  'EVER_CONNECT_ENABLED',
  'EVER_CONNECT_CODE',
  'EVER_CONNECT_INTEGRATIONS_DENY',
  'EVER_CONNECT_FEED_MODE',
  'EVER_PLATFORM_API_URL',
  'EVER_PLATFORM_ROOT_KEYS_FILE',
  'EVER_PLATFORM_ISSUER',
  'EVER_STATS_ENABLED',
  'EVER_STATS_API_URL',
  'EVER_INSTALL_SOURCE',
  'EVER_OPERATOR_UIDS',
  'SUPER_ADMIN_ACCOUNT_UID',
  'API_BASE_URL',
  'EVER_CONNECT_PROVISION_ENABLED',
  'EVER_ID_ISSUER_URL',
  'EVER_ID_ISSUER',
];

export const OPERATOR_UID = 'uid-operator';

export interface ConnectTestApp {
  app: INestApplication;
  firebase: InMemoryFirebaseApp;
  platform: FakeEverPlatform;
  clock: { now: number };
  loaded: boolean;
  signIn(uid: string): Promise<string>;
  /** A workspace record with `admin` and members. */
  seedWorkspace(id: string, admin: string, members?: string[], name?: string): void;
  http(): ReturnType<typeof request>;
  get<T = any>(token: any): T;
  close(): Promise<void>;
}

export async function createConnectTestApp(
  options: { env?: Record<string, string | undefined>; now?: number } = {},
): Promise<ConnectTestApp> {
  for (const name of EVER_CONNECT_VARIABLES) delete process.env[name];
  const env: Record<string, string | undefined> = {
    ...BASE_ENV,
    REC_JWT_SECRET: 'test-only-secret-of-this-installation-0001',
    SUPER_ADMIN_ACCOUNT_UID: OPERATOR_UID,
    EVER_STATS_ENABLED: 'false',
    EVER_PLATFORM_API_URL: FAKE_PLATFORM_URL,
    API_BASE_URL: 'https://rec-api.example.test',
    ...(options.env ?? {}),
  };
  const firebase = new InMemoryFirebaseApp();
  const toolkit = new InMemoryIdentityToolkit(firebase.authService);
  const clock = { now: options.now ?? Date.UTC(2026, 10, 19, 9, 0, 0) };
  const platform = new FakeEverPlatform(() => clock.now);
  const loaded = isEverConnectEnabled(env, () => undefined);

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }),
      EventEmitterModule.forRoot(),
      FirebaseModule,
      AuthModule,
      ...everPlatformModules(env, () => undefined),
    ],
  })
    .overrideProvider(FIREBASE_ADMIN)
    .useValue(firebase)
    .overrideProvider(FirebaseRestService)
    .useFactory({
      factory: () => {
        const service = Object.create(FirebaseRestService.prototype) as FirebaseRestService;
        (service as any).post = (path: string, body: unknown) => toolkit.post(path, body);
        return service;
      },
    })
    .overrideProvider(EVER_CONNECT_CLOCK)
    .useValue(() => clock.now)
    .overrideProvider(EVER_CONNECT_FETCH)
    .useValue(platform.fetch)
    .overrideProvider(EVER_CONNECT_AUTOSTART)
    .useValue(false)
    // Rec's workspace service writes through the default Firebase app; here the in-memory one.
    .overrideProvider(EVER_CONNECT_WORKSPACE_CREATOR)
    .useValue({
      async create(uid: string, name: string) {
        const id = `ws-${firebase.db.pushId().slice(-6)}`;
        firebase.db.write(['workspaces', id], {
          id,
          name,
          admin: uid,
          members: [{ id: uid }],
        });
        return id;
      },
    })
    .overrideProvider(EVER_CONNECT_LOCAL_PLATFORM)
    .useValue({ rootKeys: platform.rootKeys, issuer: FAKE_PLATFORM_ISSUER })
    .compile();

  // Errors only: an unexpected 500 shows its cause in the test output.
  const app = moduleRef.createNestApplication({ logger: ['error'] });
  app.setGlobalPrefix('api/v1');
  await app.init();

  return {
    app,
    firebase,
    platform,
    clock,
    loaded,
    async signIn(uid: string) {
      const email = `${uid}@example.test`;
      if (!firebase.authService.users.has(uid)) {
        firebase.authService.addUser({ uid, email, password: 'Secret-1234', emailVerified: true });
      }
      const { data } = await toolkit.post('accounts:signInWithPassword', {
        email,
        password: 'Secret-1234',
      });
      return data.idToken as string;
    },
    seedWorkspace(id, admin, members = [], name = `Workspace ${id}`) {
      firebase.db.write(['workspaces', id], {
        id,
        name,
        admin,
        members: [admin, ...members].map((uid) => ({ id: uid })),
      });
    },
    http: () => request(app.getHttpServer()),
    get: (token: any) => moduleRef.get(token, { strict: false }),
    close: async () => {
      await app.close();
    },
  };
}
