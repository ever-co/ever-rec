import { Injectable } from '@nestjs/common';
import { AbstractHandler } from 'src/common/pipeline/abstract.handler';
import { PipelineHandler } from 'src/common/pipeline/pipeline.decorator';
import { PipelineType } from 'src/common/pipeline/types';
import { AuthProviderId } from 'src/module/auth/interfaces/auth.interface';
import { TokenRefreshResponse } from 'src/module/auth/services/tokens';
import { MergeTokenPolicy } from 'src/module/auth/services/tokens/policies/merge-token.policy';
import { FirebaseAuthService } from 'src/module/firebase/services/firebase-auth.service';
import {
  IRequestCamshotUploader,
  ICamshotDbRecord,
} from '../interfaces/camshot.interface';
import { CamshotService } from '../camshot.service';

@Injectable()
@PipelineHandler({
  pipelineType: PipelineType.UPLOAD_CAMSHOT,
  provider: AuthProviderId.FIREBASE,
  order: 0,
})
export class FirebaseCamshotUploader extends AbstractHandler<
  IRequestCamshotUploader,
  ICamshotDbRecord
> {
  constructor(
    private readonly firebaseAuthService: FirebaseAuthService,
    private readonly tokenPolicy: MergeTokenPolicy,
    private readonly camshotService: CamshotService,
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
        await this.tokenPolicy.decode<TokenRefreshResponse>(token);
        return true;
      }

      // If policy says invalid, try Firebase verification as fallback
      await this.firebaseAuthService.verifyToken(token);
      return true;
    } catch (error) {
      return false;
    }
  }

  public async process({
    camshot: payload,
  }: IRequestCamshotUploader): Promise<ICamshotDbRecord> {
    const { data } = await this.camshotService.uploadCamshot({
      userId: payload.userId,
      duration: payload.duration,
      file: payload.file,
      folderId: payload.folderId,
      title: payload.title,
    });
    return data;
  }
}
