import { Injectable } from '@nestjs/common';
import { GauzyAuthService } from '../../../../gauzy';
import { IRegisterProps } from '../../authentication.service';
import { StateId } from '../../login/interfaces/login-state.interface';
import { RegisterContext } from '../register.context';
import { RegisterState } from '../interfaces/register-state.interface';

@Injectable()
export class GauzyRegisterState implements RegisterState {
  public readonly ID = StateId.GAUZY;
  constructor(private readonly gauzyAuthService: GauzyAuthService) { }
  public async handle(context: RegisterContext, payload: IRegisterProps): Promise<void> {

    const { data } = await this.gauzyAuthService.register(payload);

    context.result.set(this.ID, {
      refreshToken: data.refresh_token,
      accessToken: data.token,
      data: data.user
    });
  }
}
