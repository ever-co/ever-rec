/**
 * Builds the auth part of the API plus the optional anonymous usage statistics modules (when
 * `EVER_STATS_ENABLED` allows them, exactly as `AppModule` decides) on top of the in-memory
 * Firebase doubles, with a controllable clock and a recorded HTTP client. The scheduler's timer is
 * not started: tests drive it.
 */
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { isEverStatsEnabled } from '../../src/common/ever-platform/env';
import { everPlatformModules } from '../../src/common/ever-platform/modules';
import { AuthModule } from '../../src/module/auth/auth.module';
import { EVER_STATS_CLOCK } from '../../src/module/ever-stats/ever-stats.clock';
import { EVER_STATS_AUTOSTART } from '../../src/module/ever-stats/ever-stats-scheduler.service';
import { EVER_STATS_FETCH, StatsFetch } from '../../src/module/ever-stats/ever-stats-sender.service';
import { FIREBASE_ADMIN } from '../../src/module/firebase/firebase.constants';
import { FirebaseModule } from '../../src/module/firebase/firebase.module';
import { FirebaseRestService } from '../../src/module/firebase/services/firebase-rest.service';
import { InMemoryFirebaseApp, InMemoryIdentityToolkit } from './in-memory-firebase';
import { BASE_ENV } from './test-app';

/** Every variable the statistics modules read, cleared so the host environment cannot leak in. */
export const EVER_STATS_VARIABLES = [
  'EVER_STATS_ENABLED',
  'EVER_STATS_API_URL',
  'EVER_PLATFORM_API_URL',
  'EVER_STATS_COUNTRY',
  'EVER_STATS_SEND_INTERVAL_S',
  'EVER_INSTALL_SOURCE',
  'EVER_OPERATOR_UIDS',
  'SUPER_ADMIN_ACCOUNT_UID',
  'GAUZY_API_URL',
  'GOOGLE_CLIENT_ID',
];

/** The operator of the test installation (`SUPER_ADMIN_ACCOUNT_UID`). */
export const OPERATOR_UID = 'uid-operator';

export interface RecordedCall {
  url: string;
  init: Record<string, any>;
}

export interface StatsTestApp {
  app: INestApplication;
  firebase: InMemoryFirebaseApp;
  toolkit: InMemoryIdentityToolkit;
  clock: { now: number };
  calls: RecordedCall[];
  /** The answer of the next sends (status, or `null` for a connection error). */
  answer: { status: number | null };
  loaded: boolean;
  /** A signed-in account; returns its Firebase ID token. */
  signIn(uid: string): Promise<string>;
  get<T = any>(token: any): T;
  close(): Promise<void>;
}

export interface StatsTestAppOptions {
  env?: Record<string, string | undefined>;
  now?: number;
  fetch?: StatsFetch;
}

export async function createStatsTestApp(options: StatsTestAppOptions = {}): Promise<StatsTestApp> {
  for (const name of EVER_STATS_VARIABLES) {
    delete process.env[name];
  }
  const env: Record<string, string | undefined> = {
    ...BASE_ENV,
    SUPER_ADMIN_ACCOUNT_UID: OPERATOR_UID,
    EVER_STATS_API_URL: 'http://mock-platform.localhost:8080',
    ...(options.env ?? {}),
  };
  const firebase = new InMemoryFirebaseApp();
  const toolkit = new InMemoryIdentityToolkit(firebase.authService);
  const clock = { now: options.now ?? Date.UTC(2026, 10, 12, 9, 0, 0) };
  const calls: RecordedCall[] = [];
  const answer = { status: 202 as number | null };
  const recorder: StatsFetch = async (url, init) => {
    calls.push({ url, init });
    if (answer.status === null) throw new TypeError('fetch failed');
    return { status: answer.status };
  };
  const loaded = isEverStatsEnabled(env, () => undefined);

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }),
      EventEmitterModule.forRoot(),
      FirebaseModule,
      AuthModule,
      // The same list AppModule spreads.
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
    .overrideProvider(EVER_STATS_CLOCK)
    .useValue(() => clock.now)
    .overrideProvider(EVER_STATS_FETCH)
    .useValue(options.fetch ?? recorder)
    .overrideProvider(EVER_STATS_AUTOSTART)
    .useValue(false)
    .compile();

  const app = moduleRef.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  await app.init();

  return {
    app,
    firebase,
    toolkit,
    clock,
    calls,
    answer,
    loaded,
    async signIn(uid: string) {
      const email = `${uid}@example.test`;
      if (!firebase.authService.users.has(uid)) {
        firebase.authService.addUser({ uid, email, password: 'Secret-1234', emailVerified: true });
      }
      const { data } = await toolkit.post('accounts:signInWithPassword', { email, password: 'Secret-1234' });
      return data.idToken as string;
    },
    get: (token: any) => moduleRef.get(token, { strict: false }),
    close: async () => {
      await app.close();
    },
  };
}
