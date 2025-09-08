import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AuthProviderId } from '../../../interfaces/auth.interface';
import { AuthContext } from '../../auth.context';
import { ResStatusEnum } from 'src/enums/ResStatusEnum';
import { GAUZY_AVAILABLE } from 'src/module/gauzy';
import { IUploadAvatarProfileProps, UpdateUserProfile, UpdateUserProfileState } from '../interfaces/update-user-profile.interface';
import { UserProfileService } from '../../user-profile.service';
import { GauzyUpdateUserAvatarState } from './gauzy-update-user-avatar.state';

@Injectable()
export class FirebaseUpdateUserAvatarState implements UpdateUserProfileState {
  public readonly ID = AuthProviderId.FIREBASE;
  constructor(
    private readonly gauzyUpdateUserAvatarState: GauzyUpdateUserAvatarState,
    private readonly userProfileService: UserProfileService,
    @Inject(GAUZY_AVAILABLE)
    private readonly isGauzyAvailable: boolean
  ) { }
  public async handle(context: AuthContext<UpdateUserProfile>, payload: IUploadAvatarProfileProps): Promise<void> {
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
