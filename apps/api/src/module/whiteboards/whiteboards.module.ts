import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { WhiteboardService } from './services/whiteboards.service';
import { WhiteboardController } from './controllers/whiteboard.controller';
import { WhiteboardTeamService } from './services/teams.service';
import { WhiteboardTeamController } from './controllers/teams.controller';

@Module({
  imports: [HttpModule],
  providers: [WhiteboardService, WhiteboardTeamService],
  controllers: [WhiteboardController, WhiteboardTeamController],
  exports: [WhiteboardService],
})
export class WhiteboardsModule {}
