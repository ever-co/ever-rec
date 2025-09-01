import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { LoginState } from '../interfaces/login-state.interface';
import { GauzyLoginState } from './gauzy-login.state';
import { AuthenticationService, ILoginProps } from '../../authentication.service';
import { ResStatusEnum } from '../../../../../enums/ResStatusEnum';
import { GAUZY_AVAILABLE } from '../../../../gauzy';
import { AuthProviderId } from '../../../interfaces/auth.interface';
import { AuthContext } from '../../auth.context';


@Injectable()
export class FirebaseLoginState implements LoginState {
  public readonly ID = AuthProviderId.FIREBASE;
  constructor(
    private readonly firebaseAuthService: AuthenticationService,
    private readonly gauzyLoginState: GauzyLoginState,
    @Inject(GAUZY_AVAILABLE)
    private readonly isGauzyAvailable: boolean
  ) { }
  public async handle(context: AuthContext, payload: ILoginProps): Promise<void> {

    const { data, status, message } = await this.firebaseAuthService.login(payload);

    if (status === ResStatusEnum.error || !data) {
      throw new BadRequestException(message);
    }

    context.result.set(this.ID, {
      refreshToken: data.refreshToken,
      accessToken: data.idToken,
      data
    });

    if (!this.isGauzyAvailable) return;

    context.setState(this.gauzyLoginState);

    await context.request(payload);
  }
}
