import { Injectable } from '@nestjs/common';
import { LoginState } from '../interfaces/login-state.interface';
import { LoginContext } from '../login.context';
import { GauzyAuthService } from '../../../../gauzy';
import { ILoginProps } from '../../authentication.service';
import { AuthProviderId } from '../../../interfaces/auth.interface';

@Injectable()
export class GauzyLoginState implements LoginState {
  public readonly ID = AuthProviderId.GAUZY;
  constructor(private readonly gauzyAuthService: GauzyAuthService) { }
  public async handle(context: LoginContext, payload: ILoginProps): Promise<void> {

    const { data } = await this.gauzyAuthService.login(payload);
    context.result.set(this.ID, {
      refreshToken: data.refresh_token,
      accessToken: data.token,
      data: data.user
    });
  }
}
