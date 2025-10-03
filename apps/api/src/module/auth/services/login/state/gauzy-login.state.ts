import { Injectable } from '@nestjs/common';
import { Login, LoginState } from '../interfaces/login-state.interface';
import { GauzyAuthService } from '../../../../gauzy';
import { ILoginProps } from '../../authentication.service';
import { AuthProviderId } from '../../../interfaces/auth.interface';
import { AuthContext } from '../../auth.context';
import { GauzyMapper } from '../../../../gauzy/interfaces/gauzy.model';

@Injectable()
export class GauzyLoginState implements LoginState {
  public readonly ID = AuthProviderId.GAUZY;
  constructor(private readonly gauzyAuthService: GauzyAuthService) { }
  public async handle(context: AuthContext<Login>, payload: ILoginProps): Promise<void> {

    const { data } = await this.gauzyAuthService.login(payload);
    context.setResult(this.ID, {
      refreshToken: data.refresh_token,
      accessToken: data.token,
      data: GauzyMapper.toUser(data.user)
    });
  }
}
