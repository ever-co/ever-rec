import { Injectable } from '@nestjs/common';
import { IDataResponse } from '../../../../interfaces/_types';
import { ResStatusEnum } from '../../../../enums/ResStatusEnum';
import { FirebaseAuthService } from '../../../firebase/services/firebase-auth.service';
import { PasswordResetEmailStrategy } from './password-reset.strategy';

@Injectable()
export class FirebasePasswordResetStrategy implements PasswordResetEmailStrategy {
  constructor(private readonly firebaseAuthService: FirebaseAuthService) { }

  async execute(email: string): Promise<IDataResponse> {
    const result = await this.firebaseAuthService.sendPasswordResetEmail(email);
    if (result.success) {
      return {
        status: ResStatusEnum.success,
        message: 'If an account exists, a reset email has been sent.',
        error: null,
        data: null,
      };
    }
    return {
      status: ResStatusEnum.error,
      message: result.error?.message || 'Failed to send password reset email',
      error: null,
      data: null,
    };
  }
}
