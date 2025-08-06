import {
  BadRequestException,
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
import { IDataResponse } from '../../interfaces/_types';
import { SharedService } from '../../services/shared/shared.service';
import { AuthService } from './auth.service';
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
import { TokenService } from './token.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly sharedService: SharedService,
  ) {}

  @UseGuards(AuthGuard)
  @Delete('remove-shared')
  async removeShared(@User() user: IRequestUser): Promise<any> {
    return await this.sharedService.removeShared(user?.id);
  }

  @Post('register')
  async register(@Body() body: RegisterDto): Promise<IDataResponse> {
    return await this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body: LoginDto): Promise<IDataResponse> {
    return this.authService.login(body);
  }

  @UseGuards(AuthGuard)
  @Get('user-data')
  async getUserData(@User() user: IRequestUser) {
    const response = await this.authService.getUserData(user?.id);
    return response;
  }

  @UseGuards(AuthGuard)
  @Put('user-data')
  @UseInterceptors(FileInterceptor('file'))
  async updateUserData(
    @User() user: IRequestUser,
    @Body() body: UpdateUserDto,
    @UploadedFile() photoURL: string,
  ) {
    return this.authService.updateUserData(
      user?.id,
      body.displayName,
      photoURL,
    );
  }

  @UseGuards(AuthGuard)
  @Post('upload-avatar')
  @UseInterceptors(FileInterceptor('file'))
  async updateUserAvatar(
    @User() user: IRequestUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.authService.uploadAvatar(user?.id, file);
  }

  @Post('login-google')
  async loginGoogle(
    @Body() { credentials }: { credentials: any },
  ): Promise<any> {
    return this.authService.processGoogleLogin(credentials);
  }

  @UseGuards(AuthGuard)
  @Delete('user')
  async deleteUser(@User() user: IRequestUser) {
    return await this.authService.deleteUser(user?.id);
  }

  @UseGuards(AuthGuard)
  @Post('generate-email-verification-link')
  async generateEmailtVerificationLinkVerificationLink(
    @Body() { email }: GenerateEmailVerificationLinkDto,
  ) {
    return this.authService.generateEmailVerificationLink(email);
  }

  @UseGuards(AuthGuard)
  @Put('update-email')
  async updateUserEmail(
    @User() user: IRequestUser,
    @Body() body: UpdateEmailDto,
  ) {
    return this.authService.changeUserEmail(user?.id, body.email);
  }

  @UseGuards(AuthGuard)
  @Put('update-pass')
  async updatePassword(
    @User() user: IRequestUser,
    @Body() body: UpdatePasswordDto,
  ) {
    return this.authService.changeUserPassword(
      user?.id,
      body.email,
      body.oldPassword,
      body.newPassword,
    );
  }

  @Get('refresh-token')
  async refreshToken(@Req() request: Request, @RefreshToken() token: string) {
    const { expiresAt, refreshToken, idToken } =
      await this.tokenService.refreshToken(token, request);
    return {
      expiresAt,
      refreshToken,
      token: idToken,
    };
  }

  @UseGuards(AuthGuard)
  @Get('user-reload')
  async reload(@User() user: IRequestUser) {
    return this.authService.getUserById(user?.id);
  }

  @UseGuards(AuthGuard)
  @Post('reauthenticate')
  async reauthenticate(@User() user: IRequestUser, @Body() body: LoginDto) {
    if (user.email !== body.email) {
      throw new BadRequestException('Emails do not match');
    }
    return this.authService.reauthenticate(body.email, body.password);
  }
}
