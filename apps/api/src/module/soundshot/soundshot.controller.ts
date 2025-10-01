import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { PipelineService } from 'src/common/pipeline/pipeline.service';
import { PipelineType } from 'src/common/pipeline/types';
import { IDataResponse } from 'src/interfaces/_types';
import { sendResponse } from 'src/services/utils/sendResponse';
import { RefreshToken } from '../auth/decorators/refresh-token.decorator';
import { User } from '../auth/decorators/user.decorator';
import { AuthGuard, IRequestUser } from '../auth/guards/auth.guard';
import { AuthProviderId } from '../auth/interfaces/auth.interface';
import { SoundshotUploadDto } from './dtos/soundshot.dto';
import {
  IRequestSoundshotUploader,
  ISoundshotDbRecord,
  ISoundShotPayload,
} from './interfaces/soundshot.interface';

@Controller('soundshots')
export class SoundshotController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Post('upload/file')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an audio file (soundshot)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: SoundshotUploadDto })
  @ApiResponse({
    status: 201,
    description: 'Audio uploaded successfully',
    type: SoundshotUploadDto,
  })
  async upload(
    @UploadedFile()
    file: Express.Multer.File,
    @Body() body: ISoundShotPayload,
    @User() user: IRequestUser,
    @RefreshToken() token: string,
  ): Promise<IDataResponse<ISoundshotDbRecord>> {
    const context = {
      soundshot: {
        ...body,
        userId: user.id,
        file,
      },
      token,
    };

    const data = await this.pipelineService.execute<
      IRequestSoundshotUploader,
      ISoundshotDbRecord
    >(PipelineType.UPLOAD_SOUNDSHOT, AuthProviderId.FIREBASE, { context });

    return sendResponse(data);
  }
}
