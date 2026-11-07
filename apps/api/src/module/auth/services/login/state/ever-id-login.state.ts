import { Inject, Injectable } from '@nestjs/common';
import { GAUZY_AVAILABLE } from '../../../../gauzy';
import {
  AuthProviderId,
  AuthState,
  TokenContainer,
} from '../../../interfaces/auth.interface';
import { AuthContext } from '../../auth.context';
import { GauzyEverIdLoginState } from './gauzy-ever-id-login.state';

/** The Ever ID identity a session was opened with. No Ever ID token is kept. */
export interface EverIdSessionIdentity {
  issuer: string;
  subject: string;
  sid: string | null;
}

/** What an Ever ID sign-in hands to the login state. */
export interface EverIdLoginPayload {
  /** The Firebase session opened for the linked account (custom token exchanged server-side). */
  firebase: {
    idToken: string;
    refreshToken: string;
    data: Record<string, unknown>;
  };
  identity: EverIdSessionIdentity;
  /**
   * The verified Ever ID ID token of this request, forwarded to the optional Gauzy chain only.
   * Absent when the sign-in no longer holds it (after the sign-up confirmation screen).
   */
  idToken?: string;
}

export type EverIdLoginResult = TokenContainer<Record<string, unknown>>;

/**
 * Login state of the Ever ID provider.
 *
 * The session is a Firebase session, so the `FIREBASE` entry is set exactly as a password or
 * Google sign-in would. The `EVER_ID` entry records which Ever ID opened the session
 * (`{ issuer, subject, sid }`) and carries no token. When the Gauzy mirror is configured the chain
 * continues with {@link GauzyEverIdLoginState}, whose failure never fails the sign-in.
 */
@Injectable()
export class EverIdLoginState
  implements AuthState<AuthContext<EverIdLoginResult>, EverIdLoginPayload>
{
  public readonly ID = AuthProviderId.EVER_ID;

  constructor(
    private readonly gauzyEverIdLoginState: GauzyEverIdLoginState,
    @Inject(GAUZY_AVAILABLE)
    private readonly isGauzyAvailable: boolean,
  ) {}

  public async handle(
    context: AuthContext<EverIdLoginResult>,
    payload: EverIdLoginPayload,
  ): Promise<void> {
    context.setResult(AuthProviderId.FIREBASE, {
      accessToken: payload.firebase.idToken,
      refreshToken: payload.firebase.refreshToken,
      data: payload.firebase.data,
    });

    context.setResult(this.ID, {
      accessToken: '',
      refreshToken: '',
      data: {
        issuer: payload.identity.issuer,
        subject: payload.identity.subject,
        sid: payload.identity.sid,
      },
    });

    if (!this.isGauzyAvailable || !payload.idToken) return;

    context.setState(this.gauzyEverIdLoginState);

    await context.request(payload);
  }
}
