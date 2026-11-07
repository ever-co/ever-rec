import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { UserService } from '../../auth/services/user.service';
import {
  ITermsAcceptanceClaim,
  TermsAcceptanceService,
} from '../../terms/terms-acceptance.service';
import { FirebaseAdminService } from '../../firebase/services/firebase-admin.service';
import { EverIdSettings } from '../ever-id.config';
import {
  EverIdRedirectErrorCode,
  EverIdTokenError,
  everIdHttpError,
} from '../ever-id.errors';
import { EVER_ID_SETTINGS } from '../ever-id.tokens';
import { randomHandle } from './ever-id-crypto.service';
import {
  EverIdIdentitySummary,
  EverIdLinkService,
  EverIdSubjectLinkedError,
} from './ever-id-link.service';
import { EverIdLoginChain, EverIdSession } from './ever-id-login.chain';
import { EverIdClaims, EverIdOidcService } from './ever-id-oidc.service';
import {
  EVER_ID_ROOTS,
  EVER_ID_TTL,
  EverIdStoreService,
} from './ever-id-store.service';

/** Where the portal lands after a sign-in when the request named no page. */
export const DEFAULT_RETURN_PATH = '/media/images';
/** Where the portal shows the Connected sign-in methods card. */
export const SETTINGS_RETURN_PATH = '/settings/profile';
/** A connection needs an authentication at most this old (plus {@link AUTH_TIME_SKEW_SECONDS}). */
export const CONNECT_MAX_AGE_SECONDS = 300;
export const AUTH_TIME_SKEW_SECONDS = 60;

const MAX_RETURN_LENGTH = 512;

type Intent = 'sign-in' | 'connect';

/** An authorization request in flight (sealed, keyed by the hash of `state`). */
interface PendingAuthorization {
  intent: Intent;
  nonce: string;
  codeVerifier: string;
  returnPath: string;
  /** The signed-in account that started a connection. */
  uid?: string;
  createdAt: number;
}

/** A sign-up waiting for the confirmation screen. */
interface PendingSignup {
  issuer: string;
  subject: string;
  email: string;
  name: string | null;
  sid: string | null;
  everPersonId: string | null;
  returnPath: string;
}

/** A settings-initiated connection waiting for the both-address confirmation. */
interface PendingConnect {
  uid: string;
  issuer: string;
  subject: string;
  emailAtLink: string;
  everPersonId: string | null;
}

/**
 * A relative portal path: starts with one `/`, no scheme, no backslash, no `@`, no control
 * characters. Anything else is refused (open-redirect guard).
 */
export function isSafeReturnPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= MAX_RETURN_LENGTH &&
    /^\/(?![/\\])[A-Za-z0-9\-._~/?=&%+,;!*()]*$/.test(value)
  );
}

/**
 * The Ever ID sign-in, sign-up and connection flows.
 *
 * Resolution on a sign-in callback, in this order:
 * 1. the `(issuer, subject)` is linked → sign in that account;
 * 2. a Rec account already uses the token's e-mail → `account_exists`: nothing is created, linked
 *    or opened; the person signs in the usual way and connects Ever ID from Settings;
 * 3. sign-up allowed → the claims are sealed and the portal shows the confirmation screen; the
 *    account is created only when the person confirms;
 * 4. otherwise `signup_disabled`.
 * An unverified e-mail never gets this far (`email_unverified`).
 */
@Injectable()
export class EverIdFlowService {
  private readonly logger = new Logger(EverIdFlowService.name);

  constructor(
    @Inject(EVER_ID_SETTINGS) private readonly settings: EverIdSettings,
    private readonly oidc: EverIdOidcService,
    private readonly store: EverIdStoreService,
    private readonly links: EverIdLinkService,
    private readonly loginChain: EverIdLoginChain,
    private readonly userService: UserService,
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly termsAcceptanceService: TermsAcceptanceService,
  ) {}

  /** `GET /auth/ever-id/start`: returns the authorization URL to redirect the browser to. */
  async startSignIn(returnPath: string | undefined): Promise<string> {
    const target = returnPath ?? DEFAULT_RETURN_PATH;
    if (!isSafeReturnPath(target)) {
      throw everIdHttpError(
        HttpStatus.BAD_REQUEST,
        'invalid_return',
        'return must be a relative portal path.',
      );
    }
    return this.begin({ intent: 'sign-in', returnPath: target });
  }

  /** `POST /auth/ever-id/connect/start`: the signed-in person re-authenticates at the issuer. */
  async startConnect(uid: string): Promise<string> {
    return this.begin({
      intent: 'connect',
      returnPath: SETTINGS_RETURN_PATH,
      uid,
    });
  }

  /** `GET /auth/ever-id/callback`: returns the portal URL to redirect the browser to. */
  async callback(query: {
    code?: unknown;
    state?: unknown;
    error?: unknown;
  }): Promise<string> {
    const state = typeof query.state === 'string' ? query.state : '';
    const pending = state
      ? await this.store.take<PendingAuthorization>(
          EVER_ID_ROOTS.pending,
          state,
        )
      : null;
    if (!pending) {
      return this.loginError('invalid_state');
    }
    const errorTarget = (code: EverIdRedirectErrorCode) =>
      pending.intent === 'connect'
        ? this.settingsError(code)
        : this.loginError(code);

    if (typeof query.error === 'string' || typeof query.code !== 'string') {
      this.logger.warn('ever_id.callback result=provider_error');
      return errorTarget('provider_error');
    }

    let claims: EverIdClaims;
    let idToken: string;
    try {
      ({ claims, idToken } = await this.oidc.exchangeCode(
        query.code,
        pending.codeVerifier,
        pending.nonce,
      ));
    } catch (error) {
      const code =
        error instanceof EverIdTokenError
          ? error.redirectCode
          : 'provider_error';
      this.logger.warn(`ever_id.callback result=${code}`);
      return errorTarget(code);
    }

    try {
      return pending.intent === 'connect'
        ? await this.connectCallback(pending, claims)
        : await this.signInCallback(pending, claims, idToken);
    } catch (error) {
      this.logger.error(
        `ever_id.callback result=provider_error: ${error instanceof Error ? error.message : 'error'}`,
      );
      return errorTarget('provider_error');
    }
  }

  /** `POST /auth/ever-id/exchange`: the session stored under a hand-off code, once. */
  async exchange(code: string): Promise<EverIdSession> {
    const session = await this.store.take<EverIdSession>(
      EVER_ID_ROOTS.handoff,
      code,
    );
    if (!session) {
      throw everIdHttpError(
        HttpStatus.NOT_FOUND,
        'invalid_code',
        'This sign-in link has expired. Please sign in again.',
      );
    }
    return session;
  }

  /** `POST /auth/ever-id/sign-up/details`: what the confirmation screen shows (read-only). */
  async signUpDetails(
    pendingKey: string,
  ): Promise<{ name: string | null; email: string }> {
    const pending = await this.store.peek<PendingSignup>(
      EVER_ID_ROOTS.pendingSignup,
      pendingKey,
    );
    if (!pending) {
      throw this.pendingExpired();
    }
    return { name: pending.name, email: pending.email };
  }

  /**
   * `POST /auth/ever-id/sign-up/confirm`: creates the account the person confirmed, links the Ever ID
   * (`jit`) and returns a hand-off code for the session.
   */
  async confirmSignUp(
    pendingKey: string,
    acceptance: {
      terms?: ITermsAcceptanceClaim[];
      ip?: string | null;
      userAgent?: string | null;
    } = {},
  ): Promise<{ code: string; returnPath: string }> {
    // Checked before the one-time record is used, so a stale form does not burn it.
    if (acceptance.terms?.length) {
      this.termsAcceptanceService.assertClaimsArePublished(acceptance.terms);
    }
    const pending = await this.store.take<PendingSignup>(
      EVER_ID_ROOTS.pendingSignup,
      pendingKey,
    );
    if (!pending) {
      throw this.pendingExpired();
    }
    const identity = {
      issuer: pending.issuer,
      subject: pending.subject,
      sid: pending.sid,
    };

    // The Ever ID may have been linked meanwhile (a second tab): sign in to that account.
    const existing = await this.links.resolve(pending.issuer, pending.subject);
    if (existing) {
      await this.links.touch(
        pending.issuer,
        pending.subject,
        pending.everPersonId,
      );
      const session = await this.loginChain.open(existing.uid, identity, {
        isNewUser: false,
      });
      return {
        code: await this.handOff(session),
        returnPath: pending.returnPath,
      };
    }

    if (!this.settings.signUpAllowed) {
      throw everIdHttpError(
        HttpStatus.FORBIDDEN,
        'signup_disabled',
        'New accounts cannot be created with Ever ID.',
      );
    }
    if (await this.emailInUse(pending.email)) {
      throw this.accountExists();
    }

    let uid: string;
    try {
      const user = await this.firebaseAdminService.createUser({
        email: pending.email,
        displayName: pending.name ?? undefined,
        // The issuer verified the address; the sign-up is refused otherwise.
        emailVerified: true,
      });
      uid = user.uid;
    } catch (error: any) {
      if (error?.code === 'auth/email-already-exists') {
        throw this.accountExists();
      }
      throw error;
    }

    try {
      await this.userService.addUserToDb({
        uid,
        email: pending.email,
        displayName: pending.name ?? undefined,
        photoURL: undefined,
        emailVerified: true,
      });
      await this.links.link({
        issuer: pending.issuer,
        subject: pending.subject,
        uid,
        everPersonId: pending.everPersonId,
        emailAtLink: pending.email,
        linkMethod: 'jit',
      });
    } catch (error) {
      // Undo the half-created account so a retry starts clean.
      await this.firebaseAdminService.deleteUser(uid).catch(() => undefined);
      await this.firebaseAdminService
        .getDatabaseRef(`users/${uid}`)
        .remove()
        .catch(() => undefined);
      if (error instanceof EverIdSubjectLinkedError) {
        throw everIdHttpError(
          HttpStatus.CONFLICT,
          'subject_linked',
          error.message,
        );
      }
      throw error;
    }

    if (acceptance.terms?.length) {
      try {
        await this.termsAcceptanceService.record(uid, acceptance.terms, {
          method: 'signup-checkbox',
          ip: acceptance.ip ?? null,
          userAgent: acceptance.userAgent ?? null,
        });
      } catch (error) {
        // Same rule as the password sign-up: the account stands, the failure is logged.
        this.logger.error(
          `Terms acceptance not recorded: ${error instanceof Error ? error.message : 'error'}`,
        );
      }
    }

    await this.links.touch(pending.issuer, pending.subject);
    const session = await this.loginChain.open(uid, identity, {
      isNewUser: true,
    });
    this.logger.log('ever_id.callback result=signup_confirmed');
    return {
      code: await this.handOff(session),
      returnPath: pending.returnPath,
    };
  }

  /** `POST /auth/ever-id/connect/details`: both addresses for the confirmation screen (read-only). */
  async connectDetails(
    uid: string,
    pendingKey: string,
  ): Promise<{ accountEmail: string; everIdEmail: string }> {
    const pending = await this.store.peek<PendingConnect>(
      EVER_ID_ROOTS.pendingConnect,
      pendingKey,
    );
    if (!pending) {
      throw this.pendingExpired();
    }
    if (pending.uid !== uid) {
      throw this.otherAccount();
    }
    const user = await this.firebaseAdminService.getUser(uid);
    return { accountEmail: user.email ?? '', everIdEmail: pending.emailAtLink };
  }

  /** `POST /auth/ever-id/connect/confirm`: writes the explicit link the person confirmed. */
  async confirmConnect(
    uid: string,
    pendingKey: string,
  ): Promise<EverIdIdentitySummary[]> {
    const peeked = await this.store.peek<PendingConnect>(
      EVER_ID_ROOTS.pendingConnect,
      pendingKey,
    );
    if (!peeked) {
      throw this.pendingExpired();
    }
    if (peeked.uid !== uid) {
      // Not consumed: only the account that started the connection can finish it.
      throw this.otherAccount();
    }
    const pending = await this.store.take<PendingConnect>(
      EVER_ID_ROOTS.pendingConnect,
      pendingKey,
    );
    if (!pending || pending.uid !== uid) {
      throw this.pendingExpired();
    }
    try {
      await this.links.link({
        issuer: pending.issuer,
        subject: pending.subject,
        uid,
        everPersonId: pending.everPersonId,
        emailAtLink: pending.emailAtLink,
        linkMethod: 'explicit',
      });
    } catch (error) {
      if (error instanceof EverIdSubjectLinkedError) {
        throw everIdHttpError(
          HttpStatus.CONFLICT,
          'subject_linked',
          error.message,
        );
      }
      throw error;
    }
    this.logger.log('ever_id.connect result=linked');
    return this.links.listForUser(uid);
  }

  async identities(uid: string): Promise<EverIdIdentitySummary[]> {
    return this.links.listForUser(uid);
  }

  /**
   * `DELETE /auth/ever-id/link`: removes one of the caller's links, unless it is the last way to
   * sign in to the account (no password, no other provider, no other Ever ID link).
   */
  async unlink(
    uid: string,
    issuer: string,
    subject: string,
  ): Promise<EverIdIdentitySummary[]> {
    const links = await this.links.listForUser(uid);
    if (
      !links.some((link) => link.issuer === issuer && link.subject === subject)
    ) {
      throw everIdHttpError(
        HttpStatus.NOT_FOUND,
        'link_not_found',
        'This Ever ID is not connected to your account.',
      );
    }
    const user = await this.firebaseAdminService.getUser(uid);
    const otherProviders = (user.providerData ?? []).filter(
      (provider) => !!provider?.providerId,
    );
    if (otherProviders.length === 0 && links.length <= 1) {
      throw everIdHttpError(
        HttpStatus.CONFLICT,
        'last_sign_in_method',
        'Ever ID is the only way to sign in to this account. Set a password first.',
      );
    }
    await this.links.unlink(uid, issuer, subject);
    this.logger.log('ever_id.unlink result=ok');
    return this.links.listForUser(uid);
  }

  private async begin(request: {
    intent: Intent;
    returnPath: string;
    uid?: string;
  }): Promise<string> {
    const state = randomHandle();
    const pending: PendingAuthorization = {
      intent: request.intent,
      nonce: randomHandle(),
      codeVerifier: randomHandle(),
      returnPath: request.returnPath,
      uid: request.uid,
      createdAt: Date.now(),
    };
    // Build the URL first: if discovery fails nothing is stored.
    const url = await this.oidc.authorizationUrl({
      state,
      nonce: pending.nonce,
      codeVerifier: pending.codeVerifier,
      ...(request.intent === 'connect'
        ? { prompt: 'login' as const, maxAge: CONNECT_MAX_AGE_SECONDS }
        : {}),
    });
    await this.store.put(
      EVER_ID_ROOTS.pending,
      state,
      pending,
      EVER_ID_TTL.pending,
    );
    return url;
  }

  private async signInCallback(
    pending: PendingAuthorization,
    claims: EverIdClaims,
    idToken: string,
  ): Promise<string> {
    const identity = {
      issuer: claims.issuer,
      subject: claims.subject,
      sid: claims.sid,
    };

    const link = await this.links.resolve(claims.issuer, claims.subject);
    if (link) {
      await this.links.touch(
        claims.issuer,
        claims.subject,
        claims.everPersonId,
      );
      const session = await this.loginChain.open(link.uid, identity, {
        isNewUser: false,
        idToken,
      });
      const code = await this.handOff(session);
      this.logger.log('ever_id.callback result=signed_in');
      return this.portalUrl('/auth/ever-id', {
        code,
        return: pending.returnPath,
      });
    }

    if (!claims.email) {
      return this.loginError('email_unverified');
    }
    if (await this.emailInUse(claims.email)) {
      this.logger.log('ever_id.callback result=account_exists');
      return this.loginError('account_exists');
    }
    if (!this.settings.signUpAllowed) {
      this.logger.log('ever_id.callback result=signup_disabled');
      return this.loginError('signup_disabled');
    }

    const key = randomHandle();
    const signup: PendingSignup = {
      issuer: claims.issuer,
      subject: claims.subject,
      email: claims.email,
      name: claims.name,
      sid: claims.sid,
      everPersonId: claims.everPersonId,
      returnPath: pending.returnPath,
    };
    await this.store.put(
      EVER_ID_ROOTS.pendingSignup,
      key,
      signup,
      EVER_ID_TTL.pendingSignup,
    );
    this.logger.log('ever_id.callback result=signup_pending');
    return this.portalUrl('/auth/ever-id', {
      confirm: key,
      return: pending.returnPath,
    });
  }

  private async connectCallback(
    pending: PendingAuthorization,
    claims: EverIdClaims,
  ): Promise<string> {
    if (!pending.uid) {
      return this.settingsError('invalid_state');
    }
    const now = Math.floor(Date.now() / 1000);
    if (
      claims.authTime === null ||
      now - claims.authTime > CONNECT_MAX_AGE_SECONDS + AUTH_TIME_SKEW_SECONDS
    ) {
      this.logger.log('ever_id.callback result=reauth_required');
      return this.settingsError('reauth_required');
    }
    if (!claims.email) {
      return this.settingsError('email_unverified');
    }
    const key = randomHandle();
    const connect: PendingConnect = {
      uid: pending.uid,
      issuer: claims.issuer,
      subject: claims.subject,
      emailAtLink: claims.email,
      everPersonId: claims.everPersonId,
    };
    await this.store.put(
      EVER_ID_ROOTS.pendingConnect,
      key,
      connect,
      EVER_ID_TTL.pendingConnect,
    );
    this.logger.log('ever_id.callback result=connect_pending');
    return this.portalUrl(SETTINGS_RETURN_PATH, { ever_id_connect: key });
  }

  private async handOff(session: EverIdSession): Promise<string> {
    const code = randomHandle();
    await this.store.put(
      EVER_ID_ROOTS.handoff,
      code,
      session,
      EVER_ID_TTL.handoff,
    );
    return code;
  }

  /** Whether a Rec account uses this e-mail. Used as a yes/no answer only; the account is never selected. */
  private async emailInUse(email: string): Promise<boolean> {
    try {
      await this.firebaseAdminService.getUserByEmail(email);
      return true;
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') {
        return false;
      }
      throw error;
    }
  }

  private portalUrl(path: string, params: Record<string, string>): string {
    const query = new URLSearchParams(params).toString();
    return `${this.settings.portalUrl}${path}${query ? `?${query}` : ''}`;
  }

  private loginError(code: EverIdRedirectErrorCode): string {
    return this.portalUrl('/auth/login', { ever_id_error: code });
  }

  private settingsError(code: EverIdRedirectErrorCode): string {
    return this.portalUrl(SETTINGS_RETURN_PATH, { ever_id_error: code });
  }

  private pendingExpired() {
    return everIdHttpError(
      HttpStatus.NOT_FOUND,
      'pending_expired',
      'This confirmation has expired. Please start again.',
    );
  }

  private accountExists() {
    return everIdHttpError(
      HttpStatus.CONFLICT,
      'account_exists',
      'An Ever Rec account with this e-mail already exists. Sign in the usual way, then connect Ever ID in Settings.',
    );
  }

  private otherAccount() {
    return everIdHttpError(
      HttpStatus.FORBIDDEN,
      'wrong_account',
      'This confirmation belongs to another account.',
    );
  }
}
