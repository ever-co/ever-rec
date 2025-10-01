import {
  Body,
  Controller,
  FileTypeValidator,
  ParseFilePipe,
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
import { RefreshToken } from '../auth/decorators/refresh-token.decorator';
import { User } from '../auth/decorators/user.decorator';
import { AuthGuard, IRequestUser } from '../auth/guards/auth.guard';
import { AuthProviderId } from '../auth/interfaces/auth.interface';
import { CamshotUploadDto } from './dtos/camshot.dto';
import {
  IRequestCamshotUploader,
  ICamshotDbRecord,
  ICamshotPayload,
} from './interfaces/camshot.interface';
import { sendResponse } from 'src/services/utils/sendResponse';
import { IDataResponse } from 'src/interfaces/_types';

@Controller('camshots')
export class CamshotController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Post('upload/file')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an image file (camshot)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CamshotUploadDto })
  @ApiResponse({
    status: 201,
    description: 'Photo uploaded successfully',
    type: CamshotUploadDto,
  })
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: 'image/*' })],
      }),
    )
    file: Express.Multer.File,
    @Body() body: ICamshotPayload,
    @User() user: IRequestUser,
    @RefreshToken() token: string,
  ): Promise<IDataResponse<ICamshotDbRecord>> {
    const context = {
      camshot: {
        ...body,
        userId: user.id,
        file,
      },
      token,
    };

    const data = await this.pipelineService.execute<
      IRequestCamshotUploader,
      ICamshotDbRecord
    >(PipelineType.UPLOAD_CAMSHOT, AuthProviderId.FIREBASE, { context });

    return sendResponse(data);
  }
}
