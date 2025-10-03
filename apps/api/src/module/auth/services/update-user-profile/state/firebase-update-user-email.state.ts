import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AuthProviderId } from '../../../interfaces/auth.interface';
import { AuthContext } from '../../auth.context';
import { ResStatusEnum } from 'src/enums/ResStatusEnum';
import { GAUZY_AVAILABLE } from 'src/module/gauzy';
import { IUpdateUserProfileProps, UpdateUserProfile, UpdateUserProfileState } from '../interfaces/update-user-profile.interface';
import { GauzyUpdateUserProfileState } from './gauzy-update-user-profile.state';
import { UserProfileService } from '../../user-profile.service';
import { UserService } from '../../user.service';

@Injectable()
export class FirebaseUpdateUserEmailState implements UpdateUserProfileState {
  public readonly ID = AuthProviderId.FIREBASE;
  constructor(
    private readonly gauzyUpdateUserProfileState: GauzyUpdateUserProfileState,
    private readonly userProfileService: UserProfileService,
    private readonly userService: UserService,
    @Inject(GAUZY_AVAILABLE)
    private readonly isGauzyAvailable: boolean
  ) { }
  public async handle(context: AuthContext<UpdateUserProfile>, payload: IUpdateUserProfileProps): Promise<void> {
    await this.userService.updateUser(payload.uid, { email: payload.email });

    // Update email in database
    const { data, status, message } = await this.userProfileService.changeUserEmail(payload.uid, payload.email);

    if (status === ResStatusEnum.error || !data) {
      throw new BadRequestException(message);
    }

    context.setResult(this.ID, data);

    const hasNext = await context.getTokenPolicy().isValid(payload.token);

    if (!this.isGauzyAvailable || !hasNext) return;

    context.setState(this.gauzyUpdateUserProfileState);

    await context.request(payload);
  }
}
