import { Injectable } from '@nestjs/common';
import { GauzyAuthService } from '../../../../gauzy';
import { AuthContext } from '../../auth.context';
import { PasswordRequest, PasswordRequestState } from '../interfaces/password-request.interface';

@Injectable()
export class GauzyRequestPasswordState implements PasswordRequestState {
  constructor(private readonly gauzyAuthService: GauzyAuthService) { }
  public async handle(_: AuthContext<PasswordRequest>, email: string): Promise<void> {
    await this.gauzyAuthService.requestPassword(email);
  }
}
