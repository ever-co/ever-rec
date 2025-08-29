import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthenticationService, ILoginProps, IRegisterProps } from '../../authentication.service';
import { StateId } from '../../login/interfaces/login-state.interface';
import { RegisterState } from '../interfaces/register-state.interface';
import { GauzyRegisterState } from './gauzy-register.state';
import { RegisterContext } from '../register.context';
import { ResStatusEnum } from 'src/enums/ResStatusEnum';


@Injectable()
export class FirebaseRegisterState implements RegisterState {
  public readonly ID = StateId.FIREBASE;
  constructor(
    private readonly firebaseAuthService: AuthenticationService,
    private readonly gauzyRegisterState: GauzyRegisterState
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

    await context.request(payload);

    context.setState(this.gauzyRegisterState);
  }
}
