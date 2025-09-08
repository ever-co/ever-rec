import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AuthProviderId } from '../../../interfaces/auth.interface';
import { AuthContext } from '../../auth.context';
import { ResStatusEnum } from 'src/enums/ResStatusEnum';
import { GAUZY_AVAILABLE } from 'src/module/gauzy';
import { IUpdateUserProfileProps, UpdateUserProfile, UpdateUserProfileState } from '../interfaces/update-user-profile.interface';
import { UserProfileService } from '../../user-profile.service';
import { UserService } from '../../user.service';
import { GauzyUpdateUserAvatarState } from './gauzy-update-user-avatar.state';
import { IUploadAvatarProps } from '../../auth-orchestrator.service';

@Injectable()
export class FirebaseUpdateUserAvatarState implements UpdateUserProfileState {
  public readonly ID = AuthProviderId.FIREBASE;
  constructor(
    private readonly gauzyUpdateUserAvatarState: GauzyUpdateUserAvatarState,
    private readonly userProfileService: UserProfileService,
    private readonly userService: UserService,
    @Inject(GAUZY_AVAILABLE)
    private readonly isGauzyAvailable: boolean
  ) { }
  public async handle(context: AuthContext<UpdateUserProfile>, payload: IUploadAvatarProps & { token: string }): Promise<void> {
    // Upload avatar
    const { data, status, message } = await this.userProfileService.uploadAvatar(payload.uid, payload.avatar);

    if (status === ResStatusEnum.error || !data) {
      throw new BadRequestException(message);
    }

    context.setResult(this.ID, data);

    const hasNext = await context.getTokenPolicy().isValid(payload.token);

    if (!this.isGauzyAvailable || !hasNext) return;

    context.setState(this.gauzyUpdateUserAvatarState);

    await context.request(payload);
  }
}
