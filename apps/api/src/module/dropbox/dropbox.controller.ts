import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Redirect,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  UPLOAD_FILE_BYTES,
  uploadOptions,
} from '../../common/uploads/upload-limits';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UserGuard } from '../auth/guards/user.guard';
import {
  newOAuthBinding,
  readOAuthBinding,
  setOAuthBindingCookie,
} from '../../services/shared/oauth-state.service';
import { DropboxService } from './dropbox.service';

@Controller('dropbox')
export class DropboxController {
  constructor(
    private readonly dropBoxService: DropboxService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(AuthGuard)
  @Post('/upload/file')
  // The web app and the extension send one of the user's images, at full size.
  @UseInterceptors(
    FileInterceptor(
      'blob',
      uploadOptions({ fileSize: UPLOAD_FILE_BYTES.image }),
    ),
  )
  async uploadFile(
    @Req() req,
    @Body() body,
    @Query() query,
    @UploadedFile() blob: any,
  ) {
    req.body.itemId = query.itemId;
    req.body.itemType = query.itemType;
    req.body.name = query.name;
    req.body.blob = blob;

    return await this.dropBoxService.dropboxUploadFile(req);
  }

  @Get('/complete-oauth')
  @Redirect()
  async completeOAuth(@Req() req, @Query() query, @Res() res) {
    let completed;
    try {
      completed = await this.dropBoxService.completeOAuth(
        query.state,
        query.code,
        readOAuthBinding(req, 'dropbox'),
      );
    } catch (e) {
      res.status(500).send(e);
    }

    const integrationsUrl = `${this.configService.get<string>(
      'WEBSITE_URL',
    )}/media/integrations`;
    return {
      url:
        completed === null
          ? `${integrationsUrl}?error=invalid_state`
          : integrationsUrl,
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
      query.itemType,
    );
  }

  @UseGuards(AuthGuard)
  @Get('sign-in')
  async generateAuthUrl(@Req() req, @Res({ passthrough: true }) res) {
    const binding = newOAuthBinding();
    const result = await this.dropBoxService.generateAuthUrl(
      req.user?.id,
      binding,
    );
    if (typeof result === 'string') {
      setOAuthBindingCookie(
        res,
        'dropbox',
        binding,
        this.configService.get<string>('API_BASE_URL'),
      );
    }
    return result;
  }
}
