import { Injectable } from '@nestjs/common';
import { AbstractHandler } from 'src/common/pipeline/abstract.handler';
import { PipelineHandler } from 'src/common/pipeline/pipeline.decorator';
import { PipelineType } from 'src/common/pipeline/types';
import {
  AuthProviderId,
  AuthStateResult,
} from 'src/module/auth/interfaces/auth.interface';
import { Login } from 'src/module/auth/services/login/interfaces/login-state.interface';
import { MergeTokenPolicy } from 'src/module/auth/services/tokens/policies/merge-token.policy';
import { GauzyUploadService } from 'src/module/gauzy/services/gauzy-upload.service';
import {
  IRequestCamshotUploader,
  ICamshotDbRecord,
} from '../interfaces/camshot.interface';

@Injectable()
@PipelineHandler({
  pipelineType: PipelineType.UPLOAD_CAMSHOT,
  provider: AuthProviderId.GAUZY,
  order: 1,
})
export class GauzyCamshotUploader extends AbstractHandler<
  IRequestCamshotUploader,
  ICamshotDbRecord
> {
  private context: AuthStateResult<Login>;
  constructor(
    private readonly gauzyUploaderService: GauzyUploadService,
    private readonly tokenPolicy: MergeTokenPolicy,
  ) {
    super();
  }

  public async canHandle({
    token,
  }: IRequestCamshotUploader): Promise<boolean> {
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
    camshot: payload,
  }: IRequestCamshotUploader): Promise<ICamshotDbRecord> {
    const { data } = await this.gauzyUploaderService.camshot({
      duration: payload.duration,
      file: payload.file,
      recordedAt: payload.recordedAt,
      'pathname': payload.pathname ?? payload.title,
      size: payload.size,
      timeSlotId: payload.timeSlotId,
      organizationId: this.context.data.organizationId,
      tenantId: this.context.data.workspaceIds[0],
      token: this.context.accessToken,
    });

    return data as any;
  }
}
