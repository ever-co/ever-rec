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
  IRequestSoundshotUploader,
  ISoundshotDbRecord,
} from '../interfaces/soundshot.interface';

@Injectable()
@PipelineHandler({
  pipelineType: PipelineType.UPLOAD_SOUNDSHOT,
  provider: AuthProviderId.GAUZY,
  order: 1,
})
export class GauzySoundshotUploader extends AbstractHandler<
  IRequestSoundshotUploader,
  ISoundshotDbRecord
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
  }: IRequestSoundshotUploader): Promise<boolean> {
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
    soundshot: payload,
  }: IRequestSoundshotUploader): Promise<ISoundshotDbRecord> {
    const { data } = await this.gauzyUploaderService.soundshot({
      duration: payload.duration,
      file: payload.file,
      channels: payload.channels,
      rate: payload.rate,
      name: payload.fullFileName ?? payload.name,
      pathname: payload.pathname ?? payload.fullFileName,
      recordedAt: payload.recordedAt,
      size: payload.size,
      timeSlotId: payload.timeSlotId,
      organizationId: this.context.data.organizationId,
      tenantId: this.context.data.workspaceIds[0],
      token: this.context.accessToken,
    });

    return data as unknown as ISoundshotDbRecord;
  }
}
