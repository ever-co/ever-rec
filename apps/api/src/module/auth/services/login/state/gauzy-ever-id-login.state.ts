import { Injectable, Logger } from '@nestjs/common';
import { GauzyRestService } from '../../../../gauzy';
import { GauzyMapper, IAuthResponse } from '../../../../gauzy/interfaces/gauzy.model';
import { AuthProviderId, AuthState } from '../../../interfaces/auth.interface';
import { AuthContext } from '../../auth.context';
import type { EverIdLoginPayload, EverIdLoginResult } from './ever-id-login.state';

/**
 * Optional second step of an Ever ID sign-in when the Gauzy mirror is configured: the verified
 * Ever ID ID token is presented to Gauzy's OpenID Connect token sign-in, and a Gauzy session, when
 * Gauzy opens one, is stored exactly as {@link GauzyLoginState} stores it.
 *
 * Non-fatal by design: Gauzy may not know this person or may not accept this client's tokens. Any
 * failure is logged as `ever_id.gauzy_chain_failed` (status only, never the token) and the Rec
 * sign-in continues without a `GAUZY` entry.
 */
@Injectable()
export class GauzyEverIdLoginState implements AuthState<AuthContext<EverIdLoginResult>, EverIdLoginPayload> {
  public readonly ID = AuthProviderId.GAUZY;
  private readonly logger = new Logger(GauzyEverIdLoginState.name);

  constructor(private readonly gauzyRestService: GauzyRestService) {}

  public async handle(context: AuthContext<EverIdLoginResult>, payload: EverIdLoginPayload): Promise<void> {
    if (!payload.idToken) return;

    try {
      const { data } = await this.gauzyRestService.post<{ id_token: string }, Partial<IAuthResponse>>(
        'auth/zitadel/token',
        { id_token: payload.idToken },
      );

      if (!data?.token || !data?.refresh_token || !data?.user) {
        this.logger.warn('ever_id.gauzy_chain_failed reason=no_session');
        return;
      }

      context.setResult(this.ID, {
        refreshToken: data.refresh_token,
        accessToken: data.token,
        data: GauzyMapper.toUser(data.user) as unknown as Record<string, unknown>,
      });
    } catch (error: any) {
      const status = error?.response?.status ?? 'unreachable';
      this.logger.warn(`ever_id.gauzy_chain_failed status=${status}`);
    }
  }
}
