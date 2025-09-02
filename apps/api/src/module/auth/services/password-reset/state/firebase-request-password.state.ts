import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ResStatusEnum } from 'src/enums/ResStatusEnum';
import { GAUZY_AVAILABLE } from '../../../../gauzy';
import { AuthProviderId } from '../../../interfaces/auth.interface';
import { AuthContext } from '../../auth.context';
import { PasswordRequest, PasswordRequestState } from '../interfaces/password-request.interface';
import { EmailService } from '../../email.service';
import { GauzyRequestPasswordState } from './gauzy-request-password.state';


@Injectable()
export class FirebaseRequestPasswordState implements PasswordRequestState {
  private readonly ID = AuthProviderId.FIREBASE;
  constructor(
    private readonly emailService: EmailService,
    private readonly gauzyRequestPasswordState: GauzyRequestPasswordState,
    @Inject(GAUZY_AVAILABLE)
    private readonly isGauzyAvailable: boolean
  ) { }
  public async handle(context: AuthContext<PasswordRequest>, email: string): Promise<void> {
    const { data, status, message } = await this.emailService.sendPasswordResetEmail(email);

    if (status === ResStatusEnum.error || !data) {
      throw new BadRequestException(message);
    }

    context.setResult(this.ID, data);

    if (!this.isGauzyAvailable) return;

    context.setState(this.gauzyRequestPasswordState);

    await context.request(email);
  }
}
