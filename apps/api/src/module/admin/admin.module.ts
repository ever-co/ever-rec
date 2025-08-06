import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, AuthModule],
  providers: [AdminService, FoldersSharedService],
  controllers: [AdminController],
})
export class AdminModule {}
