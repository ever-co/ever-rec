import { Injectable, Logger } from '@nestjs/common';
import { PipelineService } from 'src/common/pipeline/pipeline.service';
import { PipelineType } from 'src/common/pipeline/types';
import IEditorVideo from 'src/interfaces/IEditorVideo';
import { AuthProviderId } from 'src/module/auth/interfaces/auth.interface';
import { IRequestVideoUploader } from '../../view.models/video.model';

@Injectable()
export class ContextUploader {
  private readonly logger = new Logger(ContextUploader.name);

  constructor(private readonly pipeline: PipelineService) {}

  public async upload(context: IRequestVideoUploader): Promise<IEditorVideo> {
    this.logger.log(`uploading file ${context.video.fullFileName}...`);

    return this.pipeline.execute<IRequestVideoUploader, IEditorVideo>(
      PipelineType.UPLOAD_VIDEO,
      AuthProviderId.FIREBASE,
      { context },
    );
  }
}
