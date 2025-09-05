import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AuthProviderId } from '../../../interfaces/auth.interface';
import { AuthContext } from '../../auth.context';
import { ResStatusEnum } from 'src/enums/ResStatusEnum';
import { GAUZY_AVAILABLE } from 'src/module/gauzy';
import { UpdateUserProfile, UpdateUserProfileState } from '../interfaces/update-user-profile.interface';
import { GauzyUpdateUserProfileState } from './gauzy-update-user-profile.state';
import { UserProfileService } from '../../user-profile.service';
import { IUpdateUserDataProps } from '../../auth-orchestrator.service';

@Injectable()
export class FirebaseUpdateUserNameState implements UpdateUserProfileState {
  public readonly ID = AuthProviderId.FIREBASE;
  constructor(
    private readonly gauzyUpdateUserProfileState: GauzyUpdateUserProfileState,
    private readonly userProfileService: UserProfileService,
    @Inject(GAUZY_AVAILABLE)
    private readonly isGauzyAvailable: boolean
  ) { }
  public async handle(context: AuthContext<UpdateUserProfile>, payload: IUpdateUserDataProps): Promise<void> {
    const { data, status, message } = await this.userProfileService.updateUserData(payload.uid, payload.displayName);

    if (status === ResStatusEnum.error || !data) {
      throw new BadRequestException(message);
    }

    context.setResult(this.ID, data);

    if (!this.isGauzyAvailable) return;

    context.setState(this.gauzyUpdateUserProfileState);

    await context.request(payload);
  }
}
