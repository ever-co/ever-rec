import { Injectable } from '@nestjs/common';
import { GauzyAuthService } from '../../../../gauzy';
import { IRegisterProps } from '../../authentication.service';
import { RegisterState } from '../interfaces/register-state.interface';
import { GauzyLoginState } from '../../login/state/gauzy-login.state';
import { AuthProviderId } from '../../../interfaces/auth.interface';
import { AuthContext } from '../../auth.context';

@Injectable()
export class GauzyRegisterState implements RegisterState {
  public readonly ID = AuthProviderId.GAUZY;
  constructor(private readonly gauzyAuthService: GauzyAuthService, private readonly gauzyLoginState: GauzyLoginState) { }
  public async handle(context: AuthContext, payload: IRegisterProps): Promise<void> {

    await this.gauzyAuthService.register(payload);

    context.setState(this.gauzyLoginState);

    await context.request(payload);
  }
}
