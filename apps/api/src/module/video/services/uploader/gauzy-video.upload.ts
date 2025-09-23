import { Injectable } from '@nestjs/common';
import IEditorImage from 'src/interfaces/IEditorImage';
import {
  AuthProviderId,
  AuthStateResult,
} from 'src/module/auth/interfaces/auth.interface';
import { Login } from 'src/module/auth/services/login/interfaces/login-state.interface';
import { MergeTokenPolicy } from 'src/module/auth/services/tokens/policies/merge-token.policy';
import { GauzyUploadService } from 'src/module/gauzy/services/gauzy-upload.service';
import { IVideoPayload } from '../../view.models/video.model';
import { VideoUploader } from './video.uploader';

@Injectable()
export class GauzyVideoUploader extends VideoUploader {
  private context: AuthStateResult<Login>;
  constructor(
    private readonly gauzyUploaderService: GauzyUploadService,
    private readonly tokenPolicy: MergeTokenPolicy,
  ) {
    super(AuthProviderId.GAUZY);
  }

  protected async canHandle(idToken: string): Promise<boolean> {
    try {
      // First check if token is valid according to our policy
      const isValid = await this.tokenPolicy.isValid(idToken);

      if (isValid) {
        const decoded = await this.tokenPolicy.decode<Login>(idToken);
        this.context = decoded.get(this.providerId);
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  protected async process(payload: IVideoPayload): Promise<IEditorImage> {
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
