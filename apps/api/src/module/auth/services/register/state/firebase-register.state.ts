import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AuthenticationService, IRegisterProps } from '../../authentication.service';
import { StateId } from '../../login/interfaces/login-state.interface';
import { RegisterState } from '../interfaces/register-state.interface';
import { GauzyRegisterState } from './gauzy-register.state';
import { RegisterContext } from '../register.context';
import { ResStatusEnum } from 'src/enums/ResStatusEnum';
import { GAUZY_AVAILABLE } from '../../../../gauzy';


@Injectable()
export class FirebaseRegisterState implements RegisterState {
  public readonly ID = StateId.FIREBASE;
  constructor(
    private readonly firebaseAuthService: AuthenticationService,
    private readonly gauzyRegisterState: GauzyRegisterState,
    @Inject(GAUZY_AVAILABLE)
    private readonly isGauzyAvailable: boolean
  ) { }
  public async handle(context: RegisterContext, payload: IRegisterProps): Promise<void> {

    const { data, status, message } = await this.firebaseAuthService.register(payload);

    if (status === ResStatusEnum.error) {
      throw new BadRequestException(message);
    }

    context.result.set(this.ID, {
      refreshToken: data.refreshToken,
      accessToken: data.idToken,
      data
    });

    if (!this.isGauzyAvailable) return;

    context.setState(this.gauzyRegisterState);

    await context.request(payload);
  }
}
