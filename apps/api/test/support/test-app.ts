/**
 * Builds the auth part of the API (the real `AuthModule`, and `EverIdModule` when present) on top of
 * the in-memory Firebase doubles, with the same global prefix and body parsing as `main.ts`.
 */
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { AuthModule } from '../../src/module/auth/auth.module';
import { FIREBASE_ADMIN } from '../../src/module/firebase/firebase.constants';
import { FirebaseModule } from '../../src/module/firebase/firebase.module';
import { FirebaseRestService } from '../../src/module/firebase/services/firebase-rest.service';
import {
  InMemoryFirebaseApp,
  InMemoryIdentityToolkit,
} from './in-memory-firebase';

/** Variables every test app gets. */
export const BASE_ENV: Record<string, string> = {
  REC_JWT_SECRET: 'test-only-secret-not-used-anywhere-else',
  REC_JWT_EXPIRES_IN: '1h',
  REC_JWT_AUDIENCE: 'ever-rec',
  REC_JWT_ISSUER: 'rec-service',
  WEBSITE_URL: 'http://portal.example.test',
  FIREBASE_REQ_URI: 'http://localhost',
};

/** Every variable the provider reads, cleared from `process.env` so the host environment cannot leak in. */
const EVER_ID_VARIABLES = [
  'EVER_ID_ISSUER_URL',
  'EVER_ID_ISSUER',
  'EVER_ID_CLIENT_ID',
  'EVER_ID_CLIENT_SECRET',
  'EVER_ID_REDIRECT_URL',
  'EVER_ID_ALLOWED_ISSUERS',
  'EVER_ID_PLATFORM_PROJECT_ID',
  'EVER_ID_LINK_MODE',
  'EVER_ID_SIGN_UP_ALLOWED',
  'EVER_ID_JIT_SIGNUP',
  'EVER_ID_BACKCHANNEL_LOGOUT_ENABLED',
  'EVER_ID_LOGOUT_REVOKE_FIREBASE',
  'EVER_INSTALL_SOURCE',
  'GAUZY_API_URL',
];

export interface TestApp {
  app: INestApplication;
  firebase: InMemoryFirebaseApp;
  toolkit: InMemoryIdentityToolkit;
  close(): Promise<void>;
}

export interface TestAppOptions {
  env?: Record<string, string | undefined>;
  /** Import `EverIdModule` (absent on the commit the regression snapshots were recorded on). */
  everId?: boolean;
  /** Gauzy mirror base URL (sets `GAUZY_API_URL` for the Gauzy module's config). */
  gauzyApiUrl?: string;
}

/** Loads `EverIdModule` when it exists. */
export function loadEverIdModule(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../src/module/ever-id/ever-id.module').EverIdModule;
  } catch {
    return null;
  }
}

export async function createTestApp(
  options: TestAppOptions = {},
): Promise<TestApp> {
  for (const name of EVER_ID_VARIABLES) {
    delete process.env[name];
  }
  if (options.gauzyApiUrl) {
    process.env.GAUZY_API_URL = options.gauzyApiUrl;
  }
  const env = { ...BASE_ENV, ...(options.env ?? {}) };
  const firebase = new InMemoryFirebaseApp();
  const toolkit = new InMemoryIdentityToolkit(firebase.authService);

  const everIdModule = options.everId === false ? null : loadEverIdModule();
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => env],
      }),
      EventEmitterModule.forRoot(),
      FirebaseModule,
      AuthModule,
      ...(everIdModule ? [everIdModule] : []),
    ],
  })
    .overrideProvider(FIREBASE_ADMIN)
    .useValue(firebase)
    .overrideProvider(FirebaseRestService)
    .useFactory({
      factory: () => {
        const service = Object.create(
          FirebaseRestService.prototype,
        ) as FirebaseRestService;
        (service as any).post = (path: string, body: unknown) =>
          toolkit.post(path, body);
        return service;
      },
    })
    .compile();

  const app = moduleRef.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  await app.init();

  return {
    app,
    firebase,
    toolkit,
    close: async () => {
      await app.close();
      delete process.env.GAUZY_API_URL;
    },
  };
}
