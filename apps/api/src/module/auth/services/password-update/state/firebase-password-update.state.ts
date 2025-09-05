import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { AuthenticationService, IChangePasswordProps } from '../../authentication.service';
import { AuthProviderId } from '../../../interfaces/auth.interface';
import { AuthContext } from '../../auth.context';
import { PasswordUpdate, PasswordUpdateState } from '../interfaces/password-update.interface';
import { GauzyPasswordUpdateState } from './gauzy-password-update.state';
import { ResStatusEnum } from 'src/enums/ResStatusEnum';
import { GAUZY_AVAILABLE } from 'src/module/gauzy';

@Injectable()
export class FirebasePasswordUpdateState implements PasswordUpdateState {
  public readonly ID = AuthProviderId.FIREBASE;
  private readonly logger = new Logger(FirebasePasswordUpdateState.name);
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly gauzyPasswordUpdateState: GauzyPasswordUpdateState,
    @Inject(GAUZY_AVAILABLE)
    private readonly isGauzyAvailable: boolean
  ) { }
  public async handle(context: AuthContext<PasswordUpdate>, payload: IChangePasswordProps): Promise<void> {

    const { data, status, message } = await this.authenticationService.changePassword(payload);

    if (status === ResStatusEnum.error || !data) {
      throw new BadRequestException(message);
    }

    context.setResult(this.ID, {
      accessToken: data?.idToken,
      refreshToken: data?.refreshToken,
      data
    });

    const hasNext = await context.getTokenPolicy().isValid(payload.token);

    if (!this.isGauzyAvailable || !hasNext) return;

    context.setState(this.gauzyPasswordUpdateState);

    try {
      await context.request(payload);
    } catch (error) {
      await this.rollback(payload);
      throw error;
    }
  }

  private async rollback(payload: IChangePasswordProps): Promise<void> {
    try {
      // try to restore old password
      const { status, message } = await this.authenticationService.changePassword({
        ...payload,
        oldPassword: payload.newPassword,
        newPassword: payload.oldPassword,
      });
      if (status === ResStatusEnum.error) {
        this.logger.error(`Rollback failed for password update: ${message ?? 'Unknown error'}`);
      }
    } catch (err) {
      // log but don’t mask original error
      this.logger.error(`Rollback failed for password update:`, err);
    }
  }
}
