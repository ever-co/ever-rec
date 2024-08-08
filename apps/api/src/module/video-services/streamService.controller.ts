import { ConfigService } from '@nestjs/config';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '../../module/auth/guards/auth.guard';
import { VideoServicesEnum } from '../../enums/StreamingServicesEnums';
import IEditorVideo, { IStreamingDbData } from '../../interfaces/IEditorVideo';
import { StreamServiceService } from './streamService.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { TMP_PATH } from 'src/enums/tmpPathsEnums';
import { v4 as uuidv4 } from 'uuid';
import { fileExtensionMap } from 'src/services/utils/fileExtensionMap';

@Controller('stream')
export class StreamServiceController {
  private readonly defaultStreamService: VideoServicesEnum | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly streamService: StreamServiceService,
  ) {
    const DEFAULT_STREAM_SERVICE = this.configService.get<VideoServicesEnum>(
      'DEFAULT_STREAM_SERVICE',
    );

    if (!Object.values(VideoServicesEnum).includes(DEFAULT_STREAM_SERVICE)) {
      console.error(
        `Streaming service is not configured properly - DEFAULT_STREAM_SERVICE: ${DEFAULT_STREAM_SERVICE}`,
      );
      return;
    }

    this.defaultStreamService = DEFAULT_STREAM_SERVICE;
  }

  @UseGuards(AuthGuard)
  @Get('default-stream-service')
  async getDefaultStreamService(): Promise<{ service: VideoServicesEnum }> {
    return { service: this.defaultStreamService };
  }

  @UseGuards(AuthGuard)
  @Post('/save-data')
  @UseInterceptors(
    FileInterceptor('blob', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          callback(null, TMP_PATH);
        },
        filename: (req, file, cb) => {
          const filename = uuidv4();
          return cb(null, filename);
        },
      }),
    }),
  )
  async saveVideoData(
    @Req() request,
    @Body() body: IStreamingDbData,
    @UploadedFile() blob: Express.Multer.File,
  ): Promise<IEditorVideo | null> {
    const fileExtension = fileExtensionMap[blob.mimetype];

    const uid = request.user?.id;
    return this.streamService.saveVideoData(
      uid,
      body,
      blob,
      blob.filename + fileExtension,
    );
  }

  @UseGuards(AuthGuard)
  @Post('/save-data/:videoId')
  @UseInterceptors(
    FileInterceptor('blob', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          callback(null, TMP_PATH);
        },
        filename: (req, file, cb) => {
          const filename = uuidv4();
          return cb(null, filename);
        },
      }),
    }),
  )
  async updateVideoData(
    @Req() request,
    @Body() body: IStreamingDbData,
    @Param('videoId') videoId: string,
    @UploadedFile() blob: Express.Multer.File,
  ): Promise<IEditorVideo | null> {
    const fileExtension = fileExtensionMap[blob.mimetype];

    const uid = request.user?.id;
    return this.streamService.updateVideoData(
      uid,
      body,
      videoId,
      blob,
      blob.filename + fileExtension,
    );
  }
}
