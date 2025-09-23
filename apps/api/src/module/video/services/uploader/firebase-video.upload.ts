import { BadRequestException, Injectable } from '@nestjs/common';
import { VideoUploader } from './video.uploader';
import { AuthProviderId } from 'src/module/auth/interfaces/auth.interface';
import { FirebaseAuthService } from 'src/module/firebase/services/firebase-auth.service';
import { MergeTokenPolicy } from 'src/module/auth/services/tokens/policies/merge-token.policy';
import { TokenRefreshResponse } from 'src/module/auth/services/tokens';
import { VideoService } from '../../video.service';
import { IVideoPayload } from '../../view.models/video.model';
import { GauzyVideoUploader } from './gauzy-video.upload';
import IEditorVideo from 'src/interfaces/IEditorVideo';
import { ResStatusEnum } from 'src/enums/ResStatusEnum';

@Injectable()
export class FirebaseVideoUploader extends VideoUploader {
  constructor(
    private readonly firebaseAuthService: FirebaseAuthService,
    private readonly gauzyVideoUpload: GauzyVideoUploader,
    private readonly tokenPolicy: MergeTokenPolicy,
    private readonly videoService: VideoService,
  ) {
    super(AuthProviderId.FIREBASE);
  }

  protected async canHandle(idToken: string): Promise<boolean> {
    try {
      // First check if token is valid according to our policy
      const isValid = await this.tokenPolicy.isValid(idToken);

      if (isValid) {
        await this.tokenPolicy.decode<TokenRefreshResponse>(idToken);
        return true;
      }

      // If policy says invalid, try Firebase verification as fallback
      await this.firebaseAuthService.verifyToken(idToken);
      return true;
    } catch (error) {
      return false;
    }
  }

  protected async process(payload: IVideoPayload): Promise<IEditorVideo> {
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

    this.setNext(this.gauzyVideoUpload);

    return data;
  }
}
