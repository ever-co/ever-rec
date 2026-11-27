import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FirebaseAdminService } from '../../../../firebase/services/firebase-admin.service';
import { FirebaseRestService } from '../../../../firebase/services/firebase-rest.service';
import { GAUZY_AVAILABLE, GauzyAuthService } from '../../../../gauzy';
import {
  AuthContextResult,
  AuthProviderId,
  AuthStateResult,
  TokenContainer,
} from '../../../interfaces/auth.interface';
import { RefreshResponse } from '../interfaces/token.interface';
import { TokenStorageService } from '../token-storage.service';
import { UserFactory } from '../user.factory';

type ProviderMap = AuthContextResult<TokenContainer<unknown>>;
type ProviderEntries = Array<
  [AuthProviderId, AuthStateResult<TokenContainer<unknown>>]
>;

/**
 * Refreshes sessions opened by an Ever ID sign-in.
 *
 * Such a session must stay revocable by a back-channel logout, which removes its reference token
 * from storage. The general refresh chain cannot guarantee that (without the Gauzy mirror it hands
 * back the bare Firebase refresh token; with it, it issues a new reference that drops the `EVER_ID`
 * entry). Here the Firebase (and, when present, Gauzy) tokens are refreshed and written back into
 * the same storage entry, and the answer is a fresh reference to that entry. The token format is
 * the one `MergeTokenPolicy` produces.
 *
 * Every reference token whose stored provider map holds an `EVER_ID` entry takes this path, wherever
 * the Ever ID client came from (the environment or the Ever Platform connection) and even after the
 * provider was switched off; every other token goes through the existing chain unchanged.
 */
@Injectable()
export class EverIdRefreshStrategy {
  private readonly logger = new Logger(EverIdRefreshStrategy.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenStorageService: TokenStorageService,
    private readonly firebaseRest: FirebaseRestService,
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly userFactory: UserFactory,
    private readonly gauzyAuthService: GauzyAuthService,
    @Inject(GAUZY_AVAILABLE)
    private readonly isGauzyAvailable: boolean,
  ) {}

  /**
   * The provider map of a reference token opened by an Ever ID sign-in, else `null`.
   *
   * Decided from the stored provider map of the session, never from the configuration: the
   * environment names no issuer when the Ever ID client comes from the Ever Platform connection
   * (ever-co/ever-rec#257), and such a session must end with a back-channel logout all the same.
   *
   * `null` only when the token cannot belong to an Ever ID session: it is not a reference this API
   * signed (a bare Firebase refresh token, an expired reference), its entry was removed (a logout),
   * or its provider map has no `EVER_ID` entry. The general chain refuses the first two as well. A
   * failed storage read is thrown instead: the general chain would renew an Ever ID session as a
   * token that a back-channel logout no longer reaches.
   */
  async match(token: string): Promise<ProviderMap | null> {
    const id = await this.verified<{ id?: unknown }>(token).then(
      (payload) => payload?.id,
    );
    if (typeof id !== 'string' || !id) {
      return null;
    }
    const stored = await this.tokenStorageService.findById(id);
    if (!stored) {
      return null;
    }
    const entries = await this.verified<{ entries?: ProviderEntries }>(
      stored.token,
    ).then((payload) => payload?.entries);
    if (!Array.isArray(entries)) {
      return null;
    }
    const providers: ProviderMap = new Map(entries);
    return providers.has(AuthProviderId.EVER_ID) &&
      providers.has(AuthProviderId.FIREBASE)
      ? providers
      : null;
  }

  /** The payload of a token this API signed and that has not expired, else `null`. */
  private async verified<T extends object>(token: string): Promise<T | null> {
    try {
      return await this.jwtService.verifyAsync<T>(token);
    } catch {
      return null;
    }
  }

  async refresh(
    token: string,
    request: any,
    providers: ProviderMap,
  ): Promise<RefreshResponse> {
    const firebase = providers.get(AuthProviderId.FIREBASE);
    const { data } = await this.firebaseRest.post('token', {
      grant_type: 'refresh_token',
      refresh_token: firebase.refreshToken,
    });
    if (!data?.id_token || !data?.refresh_token) {
      throw new UnauthorizedException('Invalid Firebase refresh response');
    }
    const expiresAt = new Date(
      Date.now() + parseInt(data.expires_in, 10) * 1000,
    ).toISOString();
    const decoded = await this.firebaseAdmin.verifyIdToken(data.id_token);
    request.user = this.userFactory.create(decoded);

    const next = new Map<
      AuthProviderId,
      AuthStateResult<TokenContainer<unknown>>
    >(providers);
    next.set(AuthProviderId.FIREBASE, {
      accessToken: data.id_token,
      refreshToken: data.refresh_token,
      data: firebase.data,
    });

    const gauzy = providers.get(AuthProviderId.GAUZY);
    if (gauzy && this.isGauzyAvailable) {
      try {
        const { data: refreshed } = await this.gauzyAuthService.refreshToken(
          gauzy.refreshToken,
        );
        if (refreshed?.token && refreshed?.refresh_token) {
          next.set(AuthProviderId.GAUZY, {
            accessToken: refreshed.token,
            refreshToken: refreshed.refresh_token,
            data: gauzy.data,
          });
        } else {
          next.delete(AuthProviderId.GAUZY);
        }
      } catch {
        // Same rule as at sign-in: the Gauzy mirror never ends the Rec session.
        next.delete(AuthProviderId.GAUZY);
        this.logger.warn('ever_id.gauzy_refresh_failed');
      }
    }

    const { id } = await this.jwtService.verifyAsync<{ id: string }>(token);
    const serialized = await this.jwtService.signAsync({
      entries: Array.from(next.entries()),
    });
    // Fails when a back-channel logout removed the entry meanwhile: the session has ended.
    await this.tokenStorageService.update(id, serialized);
    const reference = await this.jwtService.signAsync({ id });

    return { idToken: data.id_token, refreshToken: reference, expiresAt };
  }
}
