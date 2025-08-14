import { Module } from '@nestjs/common';
import { SharedModule } from '../../services/shared/shared.module';
import { FirebaseModule } from '../firebase';
import { AuthController } from './auth.controller';
import { AuthOrchestratorService } from './services/auth-orchestrator.service';
import { AuthenticationService } from './services/authentication.service';
import { EmailService } from './services/email.service';
import { GoogleAuthService } from './services/google-auth.service';
import { UserProfileService } from './services/user-profile.service';
import { UserService } from './services/user.service';
import { TokenService } from './token.service';

@Module({
  imports: [FirebaseModule, SharedModule],
  controllers: [AuthController],
  providers: [
    // Main orchestrator service
    AuthOrchestratorService,

    // Dedicated services
    UserService,
    AuthenticationService,
    GoogleAuthService,
    EmailService,
    UserProfileService,

    // Legacy services (for backward compatibility)
    TokenService,
  ],
  exports: [
    AuthOrchestratorService,
    UserService,
    AuthenticationService,
    GoogleAuthService,
    EmailService,
    UserProfileService,
    TokenService,
  ],
})
export class AuthModule { }
