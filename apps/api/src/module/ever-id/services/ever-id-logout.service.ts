import { Inject, Injectable, Logger } from '@nestjs/common';
import { FirebaseAuthService } from '../../firebase/services/firebase-auth.service';
import { FirebaseAdminService } from '../../firebase/services/firebase-admin.service';
import { EverIdSettings } from '../ever-id.config';
import { EverIdTokenError } from '../ever-id.errors';
import { EVER_ID_SETTINGS } from '../ever-id.tokens';
import { hashHandle } from './ever-id-crypto.service';
import { EverIdOidcService } from './ever-id-oidc.service';
import { EverIdSessionIndexService } from './ever-id-session-index.service';
import { EverIdStoreService } from './ever-id-store.service';

/** `ever_id_logout_jti/{sha256(issuer NUL jti)}` → `{ expiresAt }`: logout tokens already processed. */
export const EVER_ID_LOGOUT_JTI_ROOT = 'ever_id_logout_jti';

/** A processed `jti` is remembered this long (twice the accepted token age). */
export const LOGOUT_JTI_TTL_MS = 600 * 1000;

export type EverIdLogoutResult =
  | { result: 'ok'; ended: number }
  | {
      result: 'rejected';
      reason: 'malformed' | 'invalid' | 'replayed' | 'expired';
    };

/**
 * OpenID Connect Back-Channel Logout: the issuer posts a signed logout token when the person ends
 * their Ever ID session (for instance with "Sign out everywhere"). The token is verified, each `jti`
 * is accepted once, and only the Rec sessions opened with that session id are revoked.
 */
@Injectable()
export class EverIdLogoutService {
  private readonly logger = new Logger(EverIdLogoutService.name);

  constructor(
    @Inject(EVER_ID_SETTINGS) private readonly settings: EverIdSettings,
    private readonly oidc: EverIdOidcService,
    private readonly sessionIndex: EverIdSessionIndexService,
    private readonly store: EverIdStoreService,
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly firebaseAuthService: FirebaseAuthService,
  ) {}

  async handle(logoutToken: unknown): Promise<EverIdLogoutResult> {
    if (
      typeof logoutToken !== 'string' ||
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(logoutToken)
    ) {
      this.logger.warn('ever_id.logout result=malformed');
      return { result: 'rejected', reason: 'malformed' };
    }

    let claims;
    try {
      claims = await this.oidc.verifyLogoutToken(logoutToken);
    } catch (error) {
      const reason =
        error instanceof EverIdTokenError && error.code === 'expired'
          ? 'expired'
          : 'invalid';
      this.logger.warn(`ever_id.logout result=${reason}`);
      return { result: 'rejected', reason };
    }

    if (!(await this.rememberJti(claims.issuer, claims.jti))) {
      this.logger.warn('ever_id.logout result=replayed');
      return { result: 'rejected', reason: 'replayed' };
    }

    const uids = await this.sessionIndex.revoke(
      claims.issuer,
      claims.sid,
      claims.subject,
    );
    if (this.settings.logoutRevokeFirebase) {
      for (const uid of uids) {
        await this.firebaseAuthService.revokeUserSessions(uid);
      }
    }
    this.logger.log(`ever_id.logout result=ok accounts=${uids.length}`);
    return { result: 'ok', ended: uids.length };
  }

  /** Stores the `jti`; `false` when it was already stored (a replay). */
  private async rememberJti(issuer: string, jti: string): Promise<boolean> {
    const ref = this.firebaseAdminService.getDatabaseRef(
      `${EVER_ID_LOGOUT_JTI_ROOT}/${hashHandle(`${issuer}\u0000${jti}`)}`,
    );
    const now = Date.now();
    let replay = false;
    await ref.transaction((current: { expiresAt?: number } | null) => {
      if (
        current &&
        typeof current.expiresAt === 'number' &&
        current.expiresAt > now
      ) {
        replay = true;
        return undefined;
      }
      replay = false;
      return { expiresAt: now + LOGOUT_JTI_TTL_MS };
    });
    this.store.sweepSoon(EVER_ID_LOGOUT_JTI_ROOT);
    return !replay;
  }
}
