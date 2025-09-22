import { Injectable } from '@nestjs/common';
import IEditorImage from 'src/interfaces/IEditorImage';
import {
  AuthProviderId,
  AuthStateResult,
} from 'src/module/auth/interfaces/auth.interface';
import { Login } from 'src/module/auth/services/login/interfaces/login-state.interface';
import { MergeTokenPolicy } from 'src/module/auth/services/tokens/policies/merge-token.policy';
import { GauzyUploadService } from 'src/module/gauzy/services/gauzy-upload.service';
import { IImagePayload } from '../view.models/image.model';
import { ImageUploader } from './image.uploader';

@Injectable()
export class GauzyImageUploader extends ImageUploader {
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

  protected async process(payload: IImagePayload): Promise<IEditorImage> {
    const { data } = await this.gauzyUploaderService.screenshot({
      duration: payload.duration,
      file: payload.file,
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
