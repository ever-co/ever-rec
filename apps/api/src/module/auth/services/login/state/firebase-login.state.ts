import { BadRequestException, Injectable } from '@nestjs/common';
import { LoginState, StateId } from '../interfaces/login-state.interface';
import { LoginContext } from '../login.context';
import { GauzyLoginState } from './gauzy-login.state';
import { AuthenticationService, ILoginProps } from '../../authentication.service';
import { ResStatusEnum } from 'src/enums/ResStatusEnum';


@Injectable()
export class FirebaseLoginState implements LoginState {
  public readonly ID = StateId.FIREBASE;
  constructor(
    private readonly firebaseAuthService: AuthenticationService,
    private readonly gauzyLoginState: GauzyLoginState
  ) { }
  public async handle(context: LoginContext, payload: ILoginProps): Promise<void> {

    const { data, status, message } = await this.firebaseAuthService.login(payload);

    if (status === ResStatusEnum.error) {
      throw new BadRequestException(message);
    }

    context.result.set(this.ID, {
      refreshToken: data.refreshToken,
      accessToken: data.idToken,
      data
    });

    context.setState(this.gauzyLoginState);
    await context.request(payload);
  }
}
