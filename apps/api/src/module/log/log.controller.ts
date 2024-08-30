import {
  Controller,
  Get,
  Param,
  Post,
  Redirect,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { LogService } from './log.service';

@Controller('log')
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Get('delete-app-event/:ip?')
  @Redirect()
  async deleteAppEvent(@Param('ip') ip?: string): Promise<{ url: string }> {
    await this.logService.deleteAppLog(ip || 'No ip');
    return { url: 'https://rec.so' };
  }

  @UseGuards(AuthGuard)
  @Post('segment-event')
  async saveSegmentEvent(@Req() req) {
    return this.logService.saveSegmentEvent(req);
  }
}
