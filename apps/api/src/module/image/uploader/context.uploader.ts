import { Injectable, Logger } from '@nestjs/common';
import { PipelineService } from 'src/common/pipeline/pipeline.service';
import { PipelineType } from 'src/common/pipeline/types';
import IEditorImage from 'src/interfaces/IEditorImage';
import { AuthProviderId } from 'src/module/auth/interfaces/auth.interface';
import { IRequestImageUploader } from '../view.models/image.model';

@Injectable()
export class ContextUploader {
  private readonly logger = new Logger(ContextUploader.name);

  constructor(private readonly pipeline: PipelineService) {}

  public async upload(context: IRequestImageUploader): Promise<IEditorImage> {
    this.logger.log(`uploading file ${context.image.fullFileName}...`);

    return this.pipeline.execute<IRequestImageUploader, IEditorImage>(
      PipelineType.UPLOAD_IMAGE,
      AuthProviderId.FIREBASE,
      { context },
    );
  }
}
