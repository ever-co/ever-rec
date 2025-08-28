import { Module } from '@nestjs/common';
import { FirebaseClient } from 'src/services/firebase/firebase.client';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { HttpModule } from 'nestjs-http-promise';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, AuthModule],
  providers: [EmailService, FirebaseClient, FoldersSharedService],
  controllers: [EmailController],
})
export class EmailModule {}
