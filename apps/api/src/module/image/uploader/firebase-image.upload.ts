import { Injectable } from '@nestjs/common';
import { ImageUploader } from './image.uploader';
import { AuthProviderId } from 'src/module/auth/interfaces/auth.interface';
import { FirebaseAuthService } from 'src/module/firebase/services/firebase-auth.service';
import { MergeTokenPolicy } from 'src/module/auth/services/tokens/policies/merge-token.policy';
import { TokenRefreshResponse } from 'src/module/auth/services/tokens';
import { ImageService } from '../image.service';
import { IImagePayload } from '../view.models/image.model';
import { GauzyImageUploader } from './gauzy-image.upload';
import IEditorImage from 'src/interfaces/IEditorImage';

@Injectable()
export class FirebaseImageUploader extends ImageUploader {
  constructor(
    private readonly firebaseAuthService: FirebaseAuthService,
    private readonly gauzyImageUpload: GauzyImageUploader,
    private readonly tokenPolicy: MergeTokenPolicy,
    private readonly imageService: ImageService,
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

  protected async process(payload: IImagePayload): Promise<IEditorImage> {
    const result = await this.imageService.uploadFile(
      payload.userId,
      payload.file,
      payload.title,
      payload.fullFileName,
      payload.folderId,
    );

    this.setNext(this.gauzyImageUpload);

    return result;
  }
}
