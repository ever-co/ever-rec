import { Injectable } from '@nestjs/common';
import { LoginState, StateId } from '../interfaces/login-state.interface';
import { LoginContext } from '../login.context';
import { GauzyLoginState } from './gauzy-login.state';
import { AuthenticationService, ILoginProps } from '../../authentication.service';


@Injectable()
export class FirebaseLoginState implements LoginState {
  public readonly ID = StateId.FIREBASE;
  constructor(
    private readonly firebaseAuthService: AuthenticationService,
    private readonly gauzyLoginState: GauzyLoginState
  ) { }
  public async handle(context: LoginContext, payload: ILoginProps): Promise<void> {

    const { data } = await this.firebaseAuthService.login(payload);
    context.result.set(this.ID, {
      refreshToken: data.refreshToken,
      accessToken: data.idToken,
      data
    });

    context.setState(this.gauzyLoginState);
    await context.request(payload);
  }
}
