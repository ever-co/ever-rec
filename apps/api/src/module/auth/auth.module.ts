import { Module } from '@nestjs/common';
import { SharedModule } from '../../services/shared/shared.module';
import { FirebaseModule } from '../firebase';
import { AuthController } from './auth.controller';
import { AuthOrchestratorService } from './services/auth-orchestrator.service';
import { AuthenticationService } from './services/authentication.service';
import { EmailService } from './services/email.service';
import { PasswordResetStrategyProvider } from './services/password-reset/password-reset.factory';
import { PostmarkPasswordResetStrategy } from './services/password-reset/postmark-password-reset.strategy';
import { FirebasePasswordResetStrategy } from './services/password-reset/firebase-password-reset.strategy';
import { GoogleAuthService } from './services/google-auth.service';
import { UserProfileService } from './services/user-profile.service';
import { UserService } from './services/user.service';
import { GauzyModule } from '../gauzy';
import { FirebaseLoginState } from './services/login/state/firebase-login.state';
import { GauzyLoginState } from './services/login/state/gauzy-login.state';
import { LoginChain } from './services/login/login.chain';
import { MergeTokenPolicy } from './services/tokens/policies/merge-token.policy';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TokenStorageService } from './services/tokens/token-storage.service';
import { FirebaseRefreshStrategy, FirebaseValidateStrategy, TokenService, TokenStrategyChain, UnifiedRefreshStrategy, UserFactory } from './services/tokens';
import { GauzyRefreshStrategy } from './services/tokens/refresh/gauzy-refresh.strategy';

@Module({
  imports: [JwtModule.registerAsync({
    imports: [ConfigModule],
    useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> =>
    ({
      secret: configService.get<string>('REC_JWT_SECRET', 'rec-secret'),
      signOptions: {
        expiresIn: configService.get<string>('REC_JWT_EXPIRES_IN', '1h'),
        audience: configService.get<string>('REC_JWT_AUDIENCE', 'ever-rec'),
        issuer: configService.get<string>('REC_JWT_ISSUER', 'rec-service'),
      }
    })
    ,
    inject: [ConfigService],
  }), FirebaseModule, SharedModule, GauzyModule],
  controllers: [AuthController],
  providers: [
    // Main orchestrator service
    AuthOrchestratorService,

    // Dedicated services
    UserService,
    AuthenticationService,
    GoogleAuthService,
    EmailService,
    // Password reset strategies
    PostmarkPasswordResetStrategy,
    FirebasePasswordResetStrategy,
    PasswordResetStrategyProvider,
    UserProfileService,

    // Token services
    TokenService,
    TokenStrategyChain,
    GauzyRefreshStrategy,
    UnifiedRefreshStrategy,
    FirebaseRefreshStrategy,
    FirebaseValidateStrategy,
    UserFactory,

    // State service
    FirebaseLoginState,
    GauzyLoginState,
    MergeTokenPolicy,
    TokenStorageService,
    LoginChain
  ],
  exports: [
    AuthOrchestratorService,
    UserService,
    AuthenticationService,
    GoogleAuthService,
    EmailService,
    UserProfileService,
    TokenService
  ],
})
export class AuthModule { }
