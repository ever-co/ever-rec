import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { OAuthStateService } from '../../services/shared/oauth-state.service';
import { AuthModule } from '../auth/auth.module';
import { DriveController } from './drive.controller';
import { DriveService } from './drive.service';

@Module({
  imports: [HttpModule, AuthModule],
  providers: [DriveService, FoldersSharedService, OAuthStateService],
  controllers: [DriveController],
})
export class DriveModule {}
