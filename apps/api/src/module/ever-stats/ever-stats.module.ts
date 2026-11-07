import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EverInstanceModule } from '../ever-instance/ever-instance.module';
import { EVER_STATS_CLOCK, systemClock } from './ever-stats.clock';
import { EVER_STATS_CONFIG, everStatsConfigFactory } from './ever-stats.config';
import { EverStatsBackfillService } from './ever-stats-backfill.service';
import { EverStatsCollectorService } from './ever-stats-collector.service';
import { EverStatsController } from './ever-stats.controller';
import { EverStatsCountersListener } from './ever-stats-counters.listener';
import { EVER_STATS_AUTOSTART, EverStatsSchedulerService } from './ever-stats-scheduler.service';
import { defaultStatsFetch, EVER_STATS_FETCH, EverStatsSenderService } from './ever-stats-sender.service';

const logger = new Logger('EverStatsModule');

/**
 * Anonymous usage statistics: one `ever.stats.v1` report a day about this installation as a whole
 * (counts and feature switches only), signed with its own statistics key and sent to Ever Platform.
 *
 * Loaded unless `EVER_STATS_ENABLED=false` (see `app.module.ts`); the operator can also switch it
 * off in Settings. See `docs/ever-platform/anonymous-usage-statistics.md`.
 */
@Module({
  imports: [EverInstanceModule],
  controllers: [EverStatsController],
  providers: [
    {
      provide: EVER_STATS_CONFIG,
      useFactory: (config: ConfigService) => everStatsConfigFactory(config, (message) => logger.warn(message)),
      inject: [ConfigService],
    },
    { provide: EVER_STATS_CLOCK, useValue: systemClock },
    { provide: EVER_STATS_FETCH, useValue: defaultStatsFetch },
    { provide: EVER_STATS_AUTOSTART, useValue: true },
    EverStatsCountersListener,
    EverStatsCollectorService,
    EverStatsSenderService,
    EverStatsBackfillService,
    EverStatsSchedulerService,
  ],
  exports: [EVER_STATS_CONFIG, EverStatsCollectorService, EverStatsSenderService, EverStatsSchedulerService],
})
export class EverStatsModule {}
