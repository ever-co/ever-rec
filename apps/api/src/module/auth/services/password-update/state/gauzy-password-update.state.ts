import { Injectable } from '@nestjs/common';
import { GauzyAuthService } from '../../../../gauzy';
import { IChangePasswordProps } from '../../authentication.service';
import { AuthProviderId } from '../../../interfaces/auth.interface';
import { AuthContext } from '../../auth.context';
import { PasswordUpdate, PasswordUpdateState } from '../interfaces/password-update.interface';
import { Login } from '../../login/interfaces/login-state.interface';

@Injectable()
export class GauzyPasswordUpdateState implements PasswordUpdateState {
  public readonly ID = AuthProviderId.GAUZY;
  constructor(private readonly gauzyAuthService: GauzyAuthService) { }
  public async handle(context: AuthContext<PasswordUpdate>, payload: IChangePasswordProps): Promise<void> {
    const decoded = await context.getTokenPolicy().decode<Login>(payload.token);
    const gauzyCtx = decoded.get(this.ID);

    await this.gauzyAuthService.changePassword({
      confirmPassword: payload.newPassword,
      password: payload.newPassword,
      token: gauzyCtx.accessToken,
    });

    context.setResult(this.ID, {
      accessToken: gauzyCtx.accessToken,
      refreshToken: gauzyCtx.refreshToken,
      data: {
        message: 'Password updated successfully',
        idToken: gauzyCtx.accessToken,
        refreshToken: gauzyCtx.refreshToken,
        expiresAt: new Date(Date.now() + 3000 * 1000).toISOString(),
      },
    });
  }
}
