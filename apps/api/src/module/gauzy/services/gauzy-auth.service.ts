import { Injectable } from '@nestjs/common';
import { ILoginProps, IRegisterProps } from '../../auth/services/authentication.service';
import { GauzyMapper, IAuthResponse, IGauzyChangePassword, IGauzyRegisterProps } from '../interfaces/gauzy.model';
import { GauzyRestService } from './gauzy-rest.service';
import { HeaderBuilderService } from './header-builder.service';


@Injectable()
export class GauzyAuthService {
  constructor(
    private readonly gauzyRestService: GauzyRestService,
    private readonly headerBuilderService: HeaderBuilderService
  ) { }

  public async login(input: ILoginProps) {
    return this.gauzyRestService.post<ILoginProps, IAuthResponse>('auth/login', input);
  }

  public async register(input: IRegisterProps) {
    const dto = GauzyMapper.toPersistence(input);
    return this.gauzyRestService.post<IGauzyRegisterProps, IAuthResponse>('auth/register', dto);
  }

  public async refreshToken(value: string) {
    return this.gauzyRestService.post<{ refresh_token: string }, { token: string, refresh_token: string }>('auth/refresh-token', { refresh_token: value });
  }

  public async requestPassword(email: string) {
    return this.gauzyRestService.post<{ email: string }, void>('auth/request-password', { email });
  }

  public async changePassword(input: IGauzyChangePassword) {
    const headers = this.headerBuilderService.build(input);
    const { password, confirmPassword } = input;
    return this.gauzyRestService.post<{ password: string; confirmPassword: string }, void>('auth/reset-password', { password, confirmPassword }, { headers });
  }
}
