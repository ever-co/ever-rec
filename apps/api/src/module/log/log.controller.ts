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

const DEFAULT_IP = 'No ip';

@Controller('log')
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Get('delete-app-event')
  @Redirect()
  async deleteAppEventDefault(): Promise<{ url: string }> {
    await this.logService.deleteAppLog(DEFAULT_IP);
    return { url: 'https://rec.so' };
  }

  @Get('delete-app-event/:ip')
  @Redirect()
  async deleteAppEventWithIp(
    @Param('ip') ip: string,
  ): Promise<{ url: string }> {
    await this.logService.deleteAppLog(ip);
    return { url: 'https://rec.so' };
  }

  @UseGuards(AuthGuard)
  @Post('segment-event')
  async saveSegmentEvent(@Req() req: Request) {
    return this.logService.saveSegmentEvent(req);
  }
}
