import { Injectable } from '@nestjs/common';
import { AbstractHandler } from 'src/common/pipeline/abstract.handler';
import { PipelineHandler } from 'src/common/pipeline/pipeline.decorator';
import { PipelineType } from 'src/common/pipeline/types';
import IEditorVideo from 'src/interfaces/IEditorVideo';
import {
  AuthProviderId,
  AuthStateResult,
} from 'src/module/auth/interfaces/auth.interface';
import { Login } from 'src/module/auth/services/login/interfaces/login-state.interface';
import { MergeTokenPolicy } from 'src/module/auth/services/tokens/policies/merge-token.policy';
import { GauzyUploadService } from 'src/module/gauzy/services/gauzy-upload.service';
import { IRequestVideoUploader } from '../../view.models/video.model';

@Injectable()
@PipelineHandler({
  pipelineType: PipelineType.UPLOAD_VIDEO,
  provider: AuthProviderId.GAUZY,
  order: 1,
})
export class GauzyVideoUploader extends AbstractHandler<
  IRequestVideoUploader,
  IEditorVideo
> {
  private context: AuthStateResult<Login>;
  constructor(
    private readonly gauzyUploaderService: GauzyUploadService,
    private readonly tokenPolicy: MergeTokenPolicy,
  ) {
    super();
  }

  public async canHandle({ token }: IRequestVideoUploader): Promise<boolean> {
    try {
      // First check if token is valid according to our policy
      const isValid = await this.tokenPolicy.isValid(token);

      if (isValid) {
        const decoded = await this.tokenPolicy.decode<Login>(token);
        this.context = decoded.get(this.providerId as AuthProviderId);
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  public async process({
    video: payload,
  }: IRequestVideoUploader): Promise<IEditorVideo> {
    const { data } = await this.gauzyUploaderService.video({
      duration: payload.duration,
      file: payload.file,
      title: payload.title ?? payload.fullFileName,
      codec: payload.codec,
      frameRate: payload.frameRate,
      description: payload.description,
      resolution: payload.resolution,
      pathname: payload.pathname ?? payload.fullFileName,
      recordedAt: payload.recordedAt,
      size: payload.size,
      timeSlotId: payload.timeSlotId,
      organizationId: this.context.data.organizationId,
      tenantId: this.context.data.workspaceIds[0],
      token: this.context.accessToken,
    });

    return data;
  }
}
