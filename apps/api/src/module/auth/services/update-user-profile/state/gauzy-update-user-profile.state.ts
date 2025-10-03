import { Injectable } from '@nestjs/common';
import { AuthProviderId } from '../../../interfaces/auth.interface';
import { AuthContext } from '../../auth.context';
import { Login } from '../../login/interfaces/login-state.interface';
import { IUpdateUserProfileProps, UpdateUserProfile, UpdateUserProfileState } from '../interfaces/update-user-profile.interface';
import { GauzyUserService } from 'src/module/gauzy/services/gauzy-user.service';

@Injectable()
export class GauzyUpdateUserProfileState implements UpdateUserProfileState {
  public readonly ID = AuthProviderId.GAUZY;
  constructor(private readonly gauzyUserService: GauzyUserService) { }
  public async handle(context: AuthContext<UpdateUserProfile>, payload: IUpdateUserProfileProps): Promise<void> {
    const decoded = await context.getTokenPolicy().decode<Login>(payload.token);
    const gauzyCtx = decoded.get(this.ID);

    if (!gauzyCtx) return;

    await this.gauzyUserService.updateProfile(
      gauzyCtx.data.id,
      {
        fullName: payload.displayName,
        email: payload.email,
        tenantId: gauzyCtx.data.workspaceIds[0],
        token: gauzyCtx.accessToken,
        refreshToken: gauzyCtx.refreshToken
      }
    );
  }
}
