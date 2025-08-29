import { Injectable } from '@nestjs/common';
import { GauzyRestService } from './gauzy-rest.service';
import { ILoginProps, IRegisterProps } from '../../auth/services/authentication.service';
import { GauzyMapper, IAuthResponse, IGauzyRegisterProps } from '../interfaces/gauzy.model';


@Injectable()
export class GauzyAuthService {
  constructor(
    private readonly gauzyRestService: GauzyRestService
  ) { }

  public async login(input: ILoginProps) {
    return this.gauzyRestService.post<ILoginProps, IAuthResponse>('auth/login', input);
  }

  public async register(input: IRegisterProps) {
    const dto = GauzyMapper.persitance(input);
    return this.gauzyRestService.post<IGauzyRegisterProps, IAuthResponse>('auth/register', dto);
  }

  public async refreshToken(value: string) {
    return this.gauzyRestService.post<{ refresh_token: string }, { token: string }>('auth/refresh-token', { refresh_token: value })
  }
}
