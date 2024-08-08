import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';

@Module({
  imports: [HttpModule],
  providers: [AdminService, FoldersSharedService],
  controllers: [AdminController],
})
export class AdminModule {}
