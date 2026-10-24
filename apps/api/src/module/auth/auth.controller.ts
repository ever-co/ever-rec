import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { IDataResponse } from '../../interfaces/_types';
import { SharedService } from '../../services/shared/shared.service';
import { RefreshToken } from './decorators/refresh-token.decorator';
import { User } from './decorators/user.decorator';
import {
  RegisterDto,
  UpdateEmailDto,
  UpdatePasswordDto,
  UpdateUserDto,
} from './dto/auth.dto';
import { LoginDto } from './dto/login.dto';
import { GenerateEmailVerificationLinkDto } from './dto/send-email-verification.dto';
import { AuthGuard, IRequestUser } from './guards/auth.guard';
import { EmailOwnershipGuard } from './guards/email-ownership.guard';
import { AuthOrchestratorService } from './services/auth-orchestrator.service';
import { RefreshResponse, TokenService } from './services/tokens';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authOrchestratorService: AuthOrchestratorService,
    private readonly tokenService: TokenService,
    private readonly sharedService: SharedService,
  ) {}

  @UseGuards(AuthGuard)
  @Delete('remove-shared')
  async removeShared(@User() user: IRequestUser): Promise<any> {
    return this.sharedService.removeShared(user?.id);
  }

  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Req() request: Request,
  ): Promise<IDataResponse> {
    // The IP and user-agent travel with the payload so the acceptance record
    // can carry them. `ip` is salted and digested by the recorder before it is
    // stored — the address itself is never persisted, because an audit trail
    // that retains raw addresses is a tracking database.
    return this.authOrchestratorService.register({
      ...body,
      ip: this.getClientIp(request),
      userAgent: request?.headers?.['user-agent'] ?? null,
    });
  }

  /**
   * First hop of `x-forwarded-for`, else the socket address.
   *
   * Only ever handed to `TermsAcceptanceService`, which hashes it with a
   * per-deployment salt. A spoofed `x-forwarded-for` therefore corrupts one
   * non-authoritative field of an audit row and nothing else.
   */
  private getClientIp(request: Request): string | null {
    const forwarded = request?.headers?.['x-forwarded-for'];
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;

    if (typeof first === 'string' && first.trim()) {
      return first.split(',')[0].trim();
    }

    return request?.ip ?? null;
  }

  @Post('login')
  async login(@Body() body: LoginDto): Promise<IDataResponse> {
    return this.authOrchestratorService.login(body);
  }

  @UseGuards(AuthGuard)
  @Get('user-data')
  async getUserData(@User() user: IRequestUser) {
    return this.authOrchestratorService.getUserData(user?.id);
  }

  @UseGuards(AuthGuard)
  @Get('verify-email')
  async verifyEmail(
    @User() user: IRequestUser,
  ): Promise<IDataResponse<boolean>> {
    return this.authOrchestratorService.verifyEmail(user?.email);
  }

  @UseGuards(AuthGuard)
  @Put('user-data')
  @UseInterceptors(FileInterceptor('file'))
  async updateUserData(
    @User() user: IRequestUser,
    @Body() body: UpdateUserDto,
    @UploadedFile() photoURL: string,
    @RefreshToken() token: string,
  ) {
    return this.authOrchestratorService.updateUserData({
      uid: user?.id,
      displayName: body.displayName,
      photoURL,
      token,
    });
  }

  @UseGuards(AuthGuard)
  @Post('upload-avatar')
  @UseInterceptors(FileInterceptor('file'))
  async updateUserAvatar(
    @User() user: IRequestUser,
    @UploadedFile() file: Express.Multer.File,
    @RefreshToken() token: string,
  ) {
    return this.authOrchestratorService.uploadAvatar({
      uid: user?.id,
      avatar: file,
      token,
    });
  }

  @Post('login-google')
  async loginGoogle(
    @Body() { credentials }: { credentials: string },
  ): Promise<any> {
    return this.authOrchestratorService.processGoogleLogin(credentials);
  }

  @UseGuards(AuthGuard)
  @Delete('user')
  async deleteUser(@User() user: IRequestUser) {
    return await this.authOrchestratorService.deleteUser(user?.id);
  }

  @UseGuards(AuthGuard)
  @Put('email')
  async updateEmail(
    @User() user: IRequestUser,
    @Body() body: UpdateEmailDto,
    @RefreshToken() token: string,
  ): Promise<IDataResponse> {
    return this.authOrchestratorService.changeUserEmail({
      uid: user?.id,
      email: body.email,
      token,
    });
  }

  @UseGuards(AuthGuard, EmailOwnershipGuard)
  @Put('password')
  async updatePassword(
    @User() user: IRequestUser,
    @Body() body: UpdatePasswordDto,
    @RefreshToken() token: string,
  ): Promise<IDataResponse> {
    return this.authOrchestratorService.changeUserPassword({
      uid: user?.id,
      email: body.email,
      oldPassword: body.oldPassword,
      newPassword: body.password,
      token,
    });
  }

  @Get('refresh-token')
  async refreshToken(
    @RefreshToken() token: string,
    @Req() request: any,
  ): Promise<RefreshResponse> {
    return this.tokenService.refreshToken(token, request);
  }

  @Post('reauthenticate')
  async reauthenticate(
    @Body() body: { email: string; password: string },
  ): Promise<IDataResponse> {
    return this.authOrchestratorService.reauthenticate(
      body.email,
      body.password,
    );
  }

  @Post('send-password-reset-email')
  async sendPasswordResetEmail(
    @Body() body: { email: string },
  ): Promise<IDataResponse> {
    return this.authOrchestratorService.sendPasswordResetEmail(body.email);
  }

  @Post('send-email-verification')
  async sendEmailVerification(
    @Body() body: { idToken: string },
  ): Promise<IDataResponse> {
    return this.authOrchestratorService.sendEmailVerification(body.idToken);
  }

  @Post('generate-email-verification-link')
  async generateEmailVerificationLink(
    @Body() body: GenerateEmailVerificationLinkDto,
  ): Promise<IDataResponse> {
    return this.authOrchestratorService.generateEmailVerificationLink(
      body.email,
    );
  }

  @Post('verify-email-with-code')
  async verifyEmailWithCode(
    @Body() body: { verificationCode: string },
  ): Promise<IDataResponse> {
    return this.authOrchestratorService.verifyEmailWithCode(
      body.verificationCode,
    );
  }

  @Post('resend-verification-email')
  async resendVerificationEmail(
    @Body() body: { email: string },
  ): Promise<IDataResponse> {
    return this.authOrchestratorService.resendVerificationEmail(body.email);
  }

  @UseGuards(AuthGuard)
  @Post('set-custom-claims')
  async setCustomClaims(
    @User() user: IRequestUser,
    @Body() body: { claims: any },
  ): Promise<IDataResponse> {
    return this.authOrchestratorService.setUserCustomClaims(
      user?.id,
      body.claims,
    );
  }
}
