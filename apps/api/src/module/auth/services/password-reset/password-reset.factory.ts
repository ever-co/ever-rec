import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PASSWORD_RESET_EMAIL_STRATEGY, PasswordResetEmailStrategy } from './password-reset.strategy';
import { PostmarkPasswordResetStrategy } from './postmark-password-reset.strategy';
import { FirebasePasswordResetStrategy } from './firebase-password-reset.strategy';

export const PasswordResetStrategyProvider: FactoryProvider<PasswordResetEmailStrategy> = {
  provide: PASSWORD_RESET_EMAIL_STRATEGY,
  useFactory: (
    configService: ConfigService,
    postmarkStrategy: PostmarkPasswordResetStrategy,
    firebaseStrategy: FirebasePasswordResetStrategy,
  ): PasswordResetEmailStrategy => {
    const postmarkToken = configService.get<string>('POSTMARK_CLIENT_TOKEN') ?? '';
    const postmarkSender = configService.get<string>('POSTMARK_SENDER_EMAIL') ?? '';

    if (postmarkToken && postmarkSender) {
      return postmarkStrategy;
    }
    return firebaseStrategy;
  },
  inject: [ConfigService, PostmarkPasswordResetStrategy, FirebasePasswordResetStrategy],
};
