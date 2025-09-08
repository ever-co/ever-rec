import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { SharedModule } from '../../services/shared/shared.module';
import { FirebaseModule } from '../firebase';
import { GauzyModule } from '../gauzy';
import { AuthController } from './auth.controller';
import { AuthOrchestratorService } from './services/auth-orchestrator.service';
import { AuthenticationService } from './services/authentication.service';
import { EmailService } from './services/email.service';
import { GoogleAuthService } from './services/google-auth.service';
import { LoginChain } from './services/login/login.chain';
import { FirebaseLoginState } from './services/login/state/firebase-login.state';
import { GauzyLoginState } from './services/login/state/gauzy-login.state';
import { FirebasePasswordResetStrategy } from './services/password-reset/firebase-password-reset.strategy';
import { PasswordResetStrategyProvider } from './services/password-reset/password-reset.factory';
import { PostmarkPasswordResetStrategy } from './services/password-reset/postmark-password-reset.strategy';
import { FirebaseRegisterState, GauzyRegisterState, RegisterChain } from './services/register';
import { FirebaseRefreshStrategy, FirebaseValidateStrategy, TokenService, TokenStrategyChain, UnifiedRefreshStrategy, UserFactory } from './services/tokens';
import { MergeTokenPolicy } from './services/tokens/policies/merge-token.policy';
import { GauzyRefreshStrategy } from './services/tokens/refresh/gauzy-refresh.strategy';
import { TokenStorageService } from './services/tokens/token-storage.service';
import { UserProfileService } from './services/user-profile.service';
import { UserService } from './services/user.service';
import { GauzyRequestPasswordState } from './services/password-reset/state/gauzy-request-password.state';
import { FirebaseRequestPasswordState } from './services/password-reset/state/firebase-request-password.state';
import { RequestPasswordChain } from './services/password-reset/password-request.chain';
import { GauzyPasswordUpdateState } from './services/password-update/state/gauzy-password-update.state';
import { FirebasePasswordUpdateState } from './services/password-update/state/firebase-password-update.state';
import { PasswordUpdateChain } from './services/password-update/password-update.chain';
import { UpdateUserProfileChain } from './services/update-user-profile/update-user-profile.chain';
import { FirebaseUpdateUserNameState } from './services/update-user-profile/state/firebase-update-user-name.state';
import { GauzyUpdateUserProfileState } from './services/update-user-profile/state/gauzy-update-user-profile.state';
import { WorkflowFirebaseProfileFactory } from './services/update-user-profile/workflow-profile.factory';
import { FirebaseUpdateUserEmailState } from './services/update-user-profile/state/firebase-update-user-email.state';
import { FirebaseUpdateUserAvatarState } from './services/update-user-profile/state/firebase-update-user-avatar.state';
import { GauzyUpdateUserAvatarState } from './services/update-user-profile/state/gauzy-update-user-avatar.state';

@Module({
  imports: [JwtModule.registerAsync({
    imports: [ConfigModule],
    useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> =>
    ({
      secret: configService.get<string>('REC_JWT_SECRET') || (() => { throw new Error('REC_JWT_SECRET environment variable is required') })(),
      signOptions: {
        expiresIn: configService.get<string>('REC_JWT_EXPIRES_IN', '1h'),
        audience: configService.get<string>('REC_JWT_AUDIENCE', 'ever-rec'),
        issuer: configService.get<string>('REC_JWT_ISSUER', 'rec-service'),
      }
    }),
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
    TokenStorageService,
    MergeTokenPolicy,
    GauzyRefreshStrategy,
    UnifiedRefreshStrategy,
    FirebaseRefreshStrategy,
    FirebaseValidateStrategy,
    UserFactory,

    // Login State service
    FirebaseLoginState,
    GauzyLoginState,
    LoginChain,

    // Register State service
    FirebaseRegisterState,
    GauzyRegisterState,
    RegisterChain,

    // Request Password
    GauzyRequestPasswordState,
    FirebaseRequestPasswordState,
    RequestPasswordChain,

    // Update Password
    GauzyPasswordUpdateState,
    FirebasePasswordUpdateState,
    PasswordUpdateChain,

    // Update User Profile
    FirebaseUpdateUserNameState,
    FirebaseUpdateUserEmailState,
    GauzyUpdateUserProfileState,
    FirebaseUpdateUserAvatarState,
    GauzyUpdateUserAvatarState,
    UpdateUserProfileChain,
    WorkflowFirebaseProfileFactory
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
