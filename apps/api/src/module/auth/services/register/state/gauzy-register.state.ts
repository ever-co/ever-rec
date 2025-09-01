import { Injectable } from '@nestjs/common';
import { GauzyAuthService } from '../../../../gauzy';
import { IRegisterProps } from '../../authentication.service';
import { RegisterContext } from '../register.context';
import { RegisterState } from '../interfaces/register-state.interface';
import { GauzyLoginState } from '../../login/state/gauzy-login.state';
import { AuthProviderId } from '../../../interfaces/auth.interface';

@Injectable()
export class GauzyRegisterState implements RegisterState {
  public readonly ID = AuthProviderId.GAUZY;
  constructor(private readonly gauzyAuthService: GauzyAuthService, private readonly gauzyLoginState: GauzyLoginState) { }
  public async handle(context: RegisterContext, payload: IRegisterProps): Promise<void> {

    await this.gauzyAuthService.register(payload);

    context.setState(this.gauzyLoginState);

    await context.request(payload);
  }
}
