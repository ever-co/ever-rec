import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import { AuthGuard } from '../../module/auth/guards/auth.guard';
import { VideoServicesEnum } from '../../enums/StreamingServicesEnums';
import IEditorVideo, { IStreamingDbData } from '../../interfaces/IEditorVideo';
import { StreamServiceService } from './streamService.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { TMP_PATH } from 'src/enums/tmpPathsEnums';
import { v4 as uuidv4 } from 'uuid';
import { fileExtensionMap } from 'src/services/utils/fileExtensionMap';
import {
  UPLOAD_FILE_BYTES,
  uploadOptions,
} from 'src/common/multipart/upload-limits';

/**
 * Both save routes need the recording itself: a form without its `blob` part, or a JSON body,
 * is the client's mistake (400), refused before anything is written or uploaded.
 */
function requireVideoFile(
  blob: Express.Multer.File | undefined,
): asserts blob is Express.Multer.File {
  if (!blob) {
    throw new BadRequestException('A video file is required');
  }
}

/**
 * The extension the recording is stored and converted under, looked up as on the upload routes: a
 * type we have none for is refused (415) before anything is written, uploaded or deleted. It used
 * to be stored as `<id>undefined`, a name ffmpeg cannot convert to. These routes have no
 * RemoveUploadInterceptor (the bucket upload reads the file in the background), so the temporary
 * file of a refused upload is removed here.
 */
async function requireVideoExtension(
  blob: Express.Multer.File,
): Promise<string> {
  const fileExtension = fileExtensionMap[blob.mimetype];
  if (!fileExtension) {
    if (blob.path) {
      await unlink(blob.path).catch(() => undefined);
    }
    throw new UnsupportedMediaTypeException(
      `Unsupported media type: ${blob.mimetype}`,
    );
  }
  return fileExtension;
}

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
    FileInterceptor(
      'blob',
      uploadOptions(
        { fileSize: UPLOAD_FILE_BYTES.video },
        {
          storage: diskStorage({
            destination: (req, file, callback) => {
              callback(null, TMP_PATH);
            },
            filename: (req, file, cb) => {
              const filename = uuidv4();
              return cb(null, filename);
            },
          }),
        },
      ),
    ),
  )
  async saveVideoData(
    @Req() request,
    @Body() body: IStreamingDbData,
    @UploadedFile() blob: Express.Multer.File | undefined,
  ): Promise<IEditorVideo | null> {
    requireVideoFile(blob);
    const fileExtension = await requireVideoExtension(blob);

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
    FileInterceptor(
      'blob',
      uploadOptions(
        { fileSize: UPLOAD_FILE_BYTES.video },
        {
          storage: diskStorage({
            destination: (req, file, callback) => {
              callback(null, TMP_PATH);
            },
            filename: (req, file, cb) => {
              const filename = uuidv4();
              return cb(null, filename);
            },
          }),
        },
      ),
    ),
  )
  async updateVideoData(
    @Req() request,
    @Body() body: IStreamingDbData,
    @Param('videoId') videoId: string,
    @UploadedFile() blob: Express.Multer.File | undefined,
  ): Promise<IEditorVideo | null> {
    requireVideoFile(blob);
    const fileExtension = await requireVideoExtension(blob);

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
