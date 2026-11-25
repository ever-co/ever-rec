import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Post,
  Query,
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
import { DriveService } from './drive.service';
import { UserGuard } from '../auth/guards/user.guard';
import {
  newOAuthBinding,
  OAuthStateService,
  readOAuthBinding,
  setOAuthBindingCookie,
} from '../../services/shared/oauth-state.service';

@Controller('drive')
export class DriveController {
  constructor(
    private readonly driveService: DriveService,
    private readonly oauthStateService: OAuthStateService,
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

  /**
   * The one-time `state` for a Drive connection. The web app sends it to Google and back to
   * `complete-oauth` with the code; the cookie set here ties it to this browser.
   */
  @UseGuards(AuthGuard)
  @Get('/oauth-state')
  async oauthState(@Req() req, @Res({ passthrough: true }) res) {
    const binding = newOAuthBinding();
    setOAuthBindingCookie(
      res,
      'drive',
      binding,
      this.configService.get<string>('API_BASE_URL'),
    );
    return this.oauthStateService.issue(req.user?.id, 'drive', binding);
  }

  /**
   * A code is only exchanged with a nonce issued to the signed-in user, by this browser, once.
   * Otherwise anybody could send a signed-in user a link with a code for their own Google account,
   * and the user's "Save to Drive" uploads would go to that account.
   */
  @UseGuards(AuthGuard)
  @Get('/complete-oauth')
  async completeOAuth(@Req() req, @Query() query) {
    const uid = req.user?.id;
    const issuedTo = await this.oauthStateService.consume(
      query.state,
      'drive',
      readOAuthBinding(req, 'drive'),
    );
    if (!uid || issuedTo !== uid) {
      throw new ForbiddenException(
        'The Google Drive connection could not be verified',
      );
    }
    return this.driveService.completeOAuth(uid, query.code);
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
