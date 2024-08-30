import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Redirect,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UserGuard } from '../auth/guards/user.guard';
import { DropboxService } from './dropbox.service';

@Controller('dropbox')
export class DropboxController {
  constructor(
    private readonly dropBoxService: DropboxService,
    private readonly configService: ConfigService
  ) {}

  @UseGuards(AuthGuard)
  @Post('/upload/file')
  @UseInterceptors(FileInterceptor('blob'))
  async uploadFile(
    @Req() req,
    @Body() body,
    @Query() query,
    @UploadedFile() blob: any
  ) {
    req.body.itemId = query.itemId;
    req.body.itemType = query.itemType;
    req.body.name = query.name;
    req.body.blob = blob;

    return await this.dropBoxService.dropboxUploadFile(req);
  }

  @Get('/complete-oauth')
  @Redirect()
  async completeOAuth(@Req() req, @Query() query) {
    await this.dropBoxService.completeOAuth(query.state, query.code);
    return {
      url: `${this.configService.get<string>(
        'WEBSITE_URL'
      )}/media/integrations`,
    };
  }

  @UseGuards(UserGuard)
  @Get('user')
  async getDriveUser(@Req() req) {
    return this.dropBoxService.getDriveUser(req.user?.id);
  }

  @UseGuards(AuthGuard)
  @Delete('sign-out')
  async signOutDriveUser(@Req() req) {
    return this.dropBoxService.signOut(req.user?.id);
  }

  @UseGuards(AuthGuard)
  @Delete('/file')
  async deleteFile(@Req() req, @Query() query) {
    return await this.dropBoxService.deleteFile(
      req.user?.id,
      query.itemId,
      query.itemType
    );
  }

  @UseGuards(AuthGuard)
  @Get('sign-in')
  async generateAuthUrl(@Req() req) {
    return this.dropBoxService.generateAuthUrl(req.user?.id);
  }
}
