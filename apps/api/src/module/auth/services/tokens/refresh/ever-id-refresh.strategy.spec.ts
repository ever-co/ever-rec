/**
 * Sessions opened by an Ever ID sign-in are refreshed in their own storage entry, so a back-channel
 * logout (which removes that entry) ends every reference the session was given. The stored provider
 * map of the session picks that path, not the configuration: with the Ever ID client of the Ever
 * Platform connection the environment names no issuer (ever-co/ever-rec#257).
 *
 * The real refresh chain runs on the in-memory Firebase doubles.
 */
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import {
  InMemoryFirebaseApp,
  InMemoryIdentityToolkit,
} from '../../../../../../test/support/in-memory-firebase';
import { FirebaseAdminService } from '../../../../firebase/services/firebase-admin.service';
import { FirebaseRestService } from '../../../../firebase/services/firebase-rest.service';
import { GAUZY_AVAILABLE, GauzyAuthService } from '../../../../gauzy';
import {
  AuthProviderId,
  TokenContainer,
} from '../../../interfaces/auth.interface';
import { MergeTokenPolicy } from '../policies/merge-token.policy';
import { TokenStorageService } from '../token-storage.service';
import { TokenStrategyChain } from '../token-strategy.chain';
import { UserFactory } from '../user.factory';
import { EverIdRefreshStrategy } from './ever-id-refresh.strategy';
import { FirebaseRefreshStrategy } from './firebase-refresh.strategy';
import { GauzyRefreshStrategy } from './gauzy-refresh.strategy';
import { UnifiedRefreshStrategy } from './unified-refresh.strategy';
import { FirebaseValidateStrategy } from './validations/firebase-validate.strategy';

const ISSUER = 'https://auth.ever.co';

describe('Ever ID sessions in the refresh chain', () => {
  let firebase: InMemoryFirebaseApp;
  let toolkit: InMemoryIdentityToolkit;
  let chain: TokenStrategyChain;
  let policy: MergeTokenPolicy;
  let storage: TokenStorageService;
  let jwt: JwtService;
  /** The general chain (Firebase, then Gauzy and the unified reference when Gauzy is on). */
  let generalChain: jest.SpyInstance;

  beforeEach(async () => {
    firebase = new InMemoryFirebaseApp();
    toolkit = new InMemoryIdentityToolkit(firebase.authService);
    const rest = Object.create(
      FirebaseRestService.prototype,
    ) as FirebaseRestService;
    (rest as any).post = (path: string, body: unknown) =>
      toolkit.post(path, body);

    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-only-secret-not-used-anywhere-else',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      // No configuration at all, so no `EVER_ID_ISSUER_URL`: as when the Ever ID client comes from
      // the Ever Platform connection.
      providers: [
        {
          provide: FirebaseAdminService,
          useValue: new FirebaseAdminService(firebase as any),
        },
        { provide: FirebaseRestService, useValue: rest },
        { provide: GauzyAuthService, useValue: { refreshToken: jest.fn() } },
        { provide: GAUZY_AVAILABLE, useValue: false },
        TokenStorageService,
        MergeTokenPolicy,
        UserFactory,
        FirebaseRefreshStrategy,
        GauzyRefreshStrategy,
        UnifiedRefreshStrategy,
        FirebaseValidateStrategy,
        EverIdRefreshStrategy,
        TokenStrategyChain,
      ],
    }).compile();

    chain = moduleRef.get(TokenStrategyChain);
    policy = moduleRef.get(MergeTokenPolicy);
    storage = moduleRef.get(TokenStorageService);
    jwt = moduleRef.get(JwtService);
    generalChain = jest.spyOn(
      moduleRef.get(FirebaseRefreshStrategy),
      'resolve',
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** The Firebase entry of a new account's session, as a sign-in stores it. */
  async function firebaseSession(
    uid: string,
  ): Promise<TokenContainer<unknown>> {
    const email = `${uid}@example.test`;
    firebase.authService.addUser({
      uid,
      email,
      password: 'Secret-1234',
      emailVerified: true,
    });
    const { data } = await toolkit.post('accounts:signInWithPassword', {
      email,
      password: 'Secret-1234',
    });
    return {
      accessToken: data.idToken,
      refreshToken: data.refreshToken,
      data: { id: uid, email },
    };
  }

  /** The reference token an Ever ID sign-in answers (`EverIdLoginState`, then `MergeTokenPolicy`). */
  async function everIdSignIn(uid: string): Promise<string> {
    return policy.encode(
      new Map<AuthProviderId, TokenContainer<unknown>>([
        [AuthProviderId.FIREBASE, await firebaseSession(uid)],
        [
          AuthProviderId.EVER_ID,
          {
            accessToken: '',
            refreshToken: '',
            data: { issuer: ISSUER, subject: `sub-${uid}`, sid: `sid-${uid}` },
          },
        ],
      ]),
    );
  }

  /** The storage entry a reference token names; `undefined` for anything else. */
  const entryOf = (token: string): string | undefined =>
    (jwt.decode(token) as { id?: string } | null)?.id;

  it('refreshes an Ever ID session in its own storage entry when the environment names no issuer', async () => {
    const signIn = await everIdSignIn('uid-a');
    const request: any = {};

    const first = await chain.resolveRefresh(signIn, request);
    const second = await chain.resolveRefresh(first.refreshToken, {});

    // References to the entry the sign-in recorded, never the bare Firebase refresh token.
    expect(entryOf(signIn)).toEqual(expect.any(String));
    expect(entryOf(first.refreshToken)).toBe(entryOf(signIn));
    expect(entryOf(second.refreshToken)).toBe(entryOf(signIn));
    expect(request.user).toMatchObject({ id: 'uid-a' });
    const providers = await policy.decode<TokenContainer<any>>(
      second.refreshToken,
    );
    expect(providers.get(AuthProviderId.EVER_ID)?.data).toEqual({
      issuer: ISSUER,
      subject: 'sub-uid-a',
      sid: 'sid-uid-a',
    });
    expect(providers.get(AuthProviderId.FIREBASE)?.accessToken).toBe(
      second.idToken,
    );
    expect(generalChain).not.toHaveBeenCalled();
  });

  it('ends every reference of the session once a back-channel logout removed its entry', async () => {
    const signIn = await everIdSignIn('uid-b');
    const refreshed = await chain.resolveRefresh(signIn, {});

    // What `EverIdSessionIndexService.revoke` does with the reference recorded at sign-in.
    await policy.revokeToken(signIn, { allowExpired: true });

    for (const token of [signIn, refreshed.refreshToken]) {
      await expect(chain.resolveRefresh(token, {})).rejects.toThrow();
    }
  });

  it('keeps every other session on the general chain', async () => {
    const reference = await policy.encode(
      new Map<AuthProviderId, TokenContainer<unknown>>([
        [AuthProviderId.FIREBASE, await firebaseSession('uid-c')],
      ]),
    );
    const bare = (await firebaseSession('uid-d')).refreshToken;

    // Without the Gauzy mirror the general chain answers the Firebase refresh token, as before.
    expect((await chain.resolveRefresh(reference, {})).refreshToken).toMatch(
      /^frt\.uid-c\./,
    );
    expect((await chain.resolveRefresh(bare, {})).refreshToken).toBe(bare);
    expect(generalChain).toHaveBeenCalledTimes(2);
  });

  it('never hands an Ever ID session to the general chain when its entry cannot be read', async () => {
    const signIn = await everIdSignIn('uid-e');
    jest
      .spyOn(storage, 'findById')
      .mockRejectedValueOnce(new Error('database unavailable'));

    await expect(chain.resolveRefresh(signIn, {})).rejects.toThrow(
      'database unavailable',
    );
    expect(generalChain).not.toHaveBeenCalled();

    // Once the database answers again, the session is still refreshed in its own entry.
    const refreshed = await chain.resolveRefresh(signIn, {});
    expect(entryOf(refreshed.refreshToken)).toBe(entryOf(signIn));
  });
});
