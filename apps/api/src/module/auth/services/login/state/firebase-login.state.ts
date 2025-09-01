import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { GauzyLoginState } from './gauzy-login.state';
import { AuthenticationService, ILoginProps } from '../../authentication.service';
import { ResStatusEnum } from '../../../../../enums/ResStatusEnum';
import { GAUZY_AVAILABLE } from '../../../../gauzy';
import { AuthProviderId } from '../../../interfaces/auth.interface';
import { AuthContext } from '../../auth.context';
import { LoginState } from '../interfaces/login-state.interface';
import { IUser } from '../../../../../interfaces/IUser';


@Injectable()
export class FirebaseLoginState implements LoginState {
  public readonly ID = AuthProviderId.FIREBASE;
  constructor(
    private readonly firebaseAuthService: AuthenticationService,
    private readonly gauzyLoginState: GauzyLoginState,
    @Inject(GAUZY_AVAILABLE)
    private readonly isGauzyAvailable: boolean
  ) { }
  public async handle(context: AuthContext<IUser>, payload: ILoginProps): Promise<void> {

    const { data, status, message } = await this.firebaseAuthService.login(payload);

    if (status === ResStatusEnum.error || !data) {
      throw new BadRequestException(message);
    }

    context.setResult(this.ID, {
      refreshToken: data.refreshToken,
      accessToken: data.idToken,
      data
    });

    if (!this.isGauzyAvailable) return;

    context.setState(this.gauzyLoginState);

    await context.request(payload);
  }
}
