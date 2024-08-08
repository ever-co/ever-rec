import { Module } from '@nestjs/common';
import { DriveService } from './drive.service';
import { DriveController } from './drive.controller';
import { HttpModule, HttpService } from 'nestjs-http-promise';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';

@Module({
  imports: [HttpModule],
  providers: [DriveService, FoldersSharedService],
  controllers: [DriveController],
})
export class DriveModule {}
