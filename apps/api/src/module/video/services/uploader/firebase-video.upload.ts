import { BadRequestException, Injectable } from '@nestjs/common';
import { AbstractHandler } from 'src/common/pipeline/abstract.handler';
import { PipelineHandler } from 'src/common/pipeline/pipeline.decorator';
import { PipelineType } from 'src/common/pipeline/types';
import { ResStatusEnum } from 'src/enums/ResStatusEnum';
import IEditorVideo from 'src/interfaces/IEditorVideo';
import { AuthProviderId } from 'src/module/auth/interfaces/auth.interface';
import { TokenRefreshResponse } from 'src/module/auth/services/tokens';
import { MergeTokenPolicy } from 'src/module/auth/services/tokens/policies/merge-token.policy';
import { FirebaseAuthService } from 'src/module/firebase/services/firebase-auth.service';
import { VideoService } from '../../video.service';
import { IRequestVideoUploader } from '../../view.models/video.model';

@Injectable()
@PipelineHandler({
  pipelineType: PipelineType.UPLOAD_VIDEO,
  provider: AuthProviderId.FIREBASE,
  order: 0,
})
export class FirebaseVideoUploader extends AbstractHandler<
  IRequestVideoUploader,
  IEditorVideo
> {
  constructor(
    private readonly firebaseAuthService: FirebaseAuthService,
    private readonly tokenPolicy: MergeTokenPolicy,
    private readonly videoService: VideoService,
  ) {
    super();
  }

  public async canHandle({ token }: IRequestVideoUploader): Promise<boolean> {
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
    video: payload,
  }: IRequestVideoUploader): Promise<IEditorVideo> {
    const { data, error, message, status } =
      await this.videoService.uploadVideoFile(
        payload.userId,
        payload.file,
        payload.title,
        payload.duration,
        payload.fullFileName,
        payload.folderId,
      );

    if (error || status === ResStatusEnum.error) {
      throw new BadRequestException(message);
    }

    return data;
  }
}
