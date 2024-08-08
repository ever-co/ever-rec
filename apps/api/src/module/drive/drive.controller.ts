import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { DriveService } from './drive.service';
import { UserGuard } from '../auth/guards/user.guard';

@Controller('drive')
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  @UseGuards(AuthGuard)
  @Post('/upload/file')
  @UseInterceptors(FileInterceptor('blob'))
  async uploadFile(
    @Req() req,
    @Body() body,
    @Query() query,
    @UploadedFile() blob: any,
  ) {
    return await this.driveService.driveUploadFile(
      req.user?.id,
      body.metadata,
      blob,
      query.itemId,
      query.itemType,
    );
  }

  @UseGuards(AuthGuard)
  @Delete('/file')
  async deleteFile(@Req() req, @Query() query) {
    return await this.driveService.deleteFile(
      req.user?.id,
      query.itemId,
      query.itemType,
    );
  }

  @UseGuards(AuthGuard)
  @Get('/complete-oauth')
  async completeOAuth(@Req() req, @Query() query) {
    return this.driveService.completeOAuth(req.user?.id, query.code);
  }

  @UseGuards(UserGuard)
  @Get('user')
  async getDriveUser(@Req() req) {
    return this.driveService.getDriveUser(req.user?.id);
  }

  @UseGuards(AuthGuard)
  @Delete('sign-out')
  async signOutDriveUser(@Req() req) {
    return this.driveService.signOut(req.user?.id);
  }
}
