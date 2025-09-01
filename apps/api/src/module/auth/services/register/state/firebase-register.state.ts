import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AuthenticationService, IRegisterProps } from '../../authentication.service';
import { RegisterState } from '../interfaces/register-state.interface';
import { GauzyRegisterState } from './gauzy-register.state';
import { ResStatusEnum } from 'src/enums/ResStatusEnum';
import { GAUZY_AVAILABLE } from '../../../../gauzy';
import { AuthProviderId } from '../../../interfaces/auth.interface';
import { AuthContext } from '../../auth.context';
import { IUser } from '../../../../../interfaces/IUser';


@Injectable()
export class FirebaseRegisterState implements RegisterState {
  public readonly ID = AuthProviderId.FIREBASE;
  constructor(
    private readonly firebaseAuthService: AuthenticationService,
    private readonly gauzyRegisterState: GauzyRegisterState,
    @Inject(GAUZY_AVAILABLE)
    private readonly isGauzyAvailable: boolean
  ) { }
  public async handle(context: AuthContext<IUser>, payload: IRegisterProps): Promise<void> {

    const { data, status, message } = await this.firebaseAuthService.register(payload);

    if (status === ResStatusEnum.error || !data) {
      throw new BadRequestException(message);
    }

    context.setResult(this.ID, {
      refreshToken: data.refreshToken,
      accessToken: data.idToken,
      data
    });

    if (!this.isGauzyAvailable) return;

    context.setState(this.gauzyRegisterState);

    await context.request(payload);
  }
}
