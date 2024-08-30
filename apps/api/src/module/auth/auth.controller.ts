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
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from './guards/auth.guard';
import { SharedService } from '../../services/shared/shared.service';
import { IDataResponse } from '../../interfaces/_types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sharedService: SharedService
  ) {}

  @UseGuards(AuthGuard)
  @Delete('remove-shared')
  async removeShared(@Req() req): Promise<any> {
    return await this.sharedService.removeShared(req.user?.id);
  }

  @Post('register')
  async register(
    @Body() body: { email: string; password: string; username: string }
  ): Promise<IDataResponse> {
    return await this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body: LoginDto): Promise<IDataResponse> {
    return this.authService.login(body);
  }

  @UseGuards(AuthGuard)
  @Get('user-data')
  async getUserData(@Req() req) {
    const response = await this.authService.getUserData(req.user?.id);
    return response;
  }

  @UseGuards(AuthGuard)
  @Put('user-data')
  @UseInterceptors(FileInterceptor('file'))
  async updateUserData(@Req() req, @Body() body, @UploadedFile() photo) {
    return this.authService.updateUserData(
      req.user?.id,
      body.displayName,
      photo
    );
  }

  @UseGuards(AuthGuard)
  @Post('upload-avatar')
  @UseInterceptors(FileInterceptor('file'))
  async updateUserAvatar(
    @Req() req,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.authService.uploadAvatar(req.user?.id, file);
  }

  @Post('login-google')
  async loginGoogle(
    @Body() { credentials }: { credentials: any }
  ): Promise<any> {
    return this.authService.processGoogleLogin(credentials);
  }

  @UseGuards(AuthGuard)
  @Delete('user')
  async deleteUser(@Req() req) {
    return await this.authService.deleteUser(req.user?.id);
  }

  @UseGuards(AuthGuard)
  @Put('update-email')
  async updateUserEmail(@Req() req, @Body() body) {
    return this.authService.changeUserEmail(req.user?.id, body.email);
  }

  @UseGuards(AuthGuard)
  @Put('update-pass')
  async updatePassword(@Req() req, @Body() body) {
    return this.authService.changeUserPassword(
      req.user?.id,
      body.email,
      body.oldPassword,
      body.newPassword
    );
  }
}
