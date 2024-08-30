import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import Analytics from 'analytics-node';

@Injectable()
export class EventSegment {
  private analytics;

  constructor(private readonly configService: ConfigService) {
    this.analytics = new Analytics(
      this.configService.get<string>('SEGMENT_WRITE_KEY')
    );
  }

  @OnEvent('analytics.identify')
  async listensToEventIdentify(userId: string, traits: any) {
    try {
      await this.analytics.identify({
        userId,
        ...(traits && { traits }),
      });
    } catch (error: any) {
      console.log(error, 'error');
    }
  }

  @OnEvent('analytics.track')
  async listensToEventTrack(event: string, payload: any) {
    try {
      await this.analytics.track({
        event,
        ...(payload && payload),
      });
    } catch (error: any) {
      console.log(error, 'error');
    }
  }

  @OnEvent('analytics.page')
  async listensToEventPage(payload: any) {
    try {
      await this.analytics.page(payload);
    } catch (error: any) {
      console.log(error, 'error');
    }
  }
}
