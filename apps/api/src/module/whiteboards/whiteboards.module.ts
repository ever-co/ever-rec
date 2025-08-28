import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { AuthModule } from '../auth/auth.module';
import { WhiteboardTeamController } from './controllers/teams.controller';
import { WhiteboardController } from './controllers/whiteboard.controller';
import { WhiteboardTeamService } from './services/teams.service';
import { WhiteboardService } from './services/whiteboards.service';

@Module({
  imports: [HttpModule, AuthModule],
  providers: [WhiteboardService, WhiteboardTeamService],
  controllers: [WhiteboardController, WhiteboardTeamController],
  exports: [WhiteboardService],
})
export class WhiteboardsModule {}
