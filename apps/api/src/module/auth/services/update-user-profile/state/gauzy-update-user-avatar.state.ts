import { Injectable } from '@nestjs/common';
import { AuthProviderId } from '../../../interfaces/auth.interface';
import { AuthContext } from '../../auth.context';
import { Login } from '../../login/interfaces/login-state.interface';
import { UpdateUserProfile, UpdateUserProfileState } from '../interfaces/update-user-profile.interface';
import { GauzyUploadAssetService } from 'src/module/gauzy/services/gauzy-upload-asset.service';
import { IUploadAvatarProps } from '../../auth-orchestrator.service';

@Injectable()
export class GauzyUpdateUserAvatarState implements UpdateUserProfileState {
  public readonly ID = AuthProviderId.GAUZY;
  constructor(private readonly gauzyUploadAssetService: GauzyUploadAssetService) { }
  public async handle(context: AuthContext<UpdateUserProfile>, payload: IUploadAvatarProps & { token: string; }): Promise<void> {
    const decoded = await context.getTokenPolicy().decode<Login>(payload.token);
    const gauzyCtx = decoded.get(this.ID);

    await this.gauzyUploadAssetService.uploadAvatar(
      {
        file: payload.avatar,
        tenantId: gauzyCtx.data.workspaceIds[0],
        organizationId: gauzyCtx.data.organizationId,
        token: gauzyCtx.accessToken,
        refreshToken: gauzyCtx.refreshToken,
      }
    );
  }
}
