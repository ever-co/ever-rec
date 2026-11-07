import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EverInstanceService } from '../ever-instance/ever-instance.service';
import { EVER_INSTANCE_EVENTS } from '../ever-instance/ever-instance.types';
import {
  EverOperatorGuard,
  EverSignedInGuard,
} from '../ever-instance/ever-operator.guard';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVER_STATS_CLOCK, EverStatsClock, monthOf } from './ever-stats.clock';
import { EVER_STATS_CONFIG, EverStatsConfig } from './ever-stats.config';
import {
  STATS_REPORTS_KEPT,
  STATS_SEND_NOW_INTERVAL_MS,
} from './ever-stats.constants';
import { EverStatsBackfillService } from './ever-stats-backfill.service';
import { EverStatsCollectorService } from './ever-stats-collector.service';
import { EverStatsSchedulerService } from './ever-stats-scheduler.service';
import {
  EverStatsSenderService,
  StatsReportRow,
} from './ever-stats-sender.service';

/** Why the statistics are on or off. */
export type StatsReason = 'env' | 'ui' | 'cloud-managed';

/** A stored report as the operator sees it (the exact bytes, the date, the answer). */
function reportView(row: StatsReportRow) {
  return {
    reportId: row.reportId,
    period: row.period,
    final: row.final === true,
    payload: row.payload ?? '',
    createdAt: row.createdAt,
    sent_at: row.sentAt ?? null,
    httpStatus: row.httpStatus ?? null,
    status: row.status,
    attempts: row.attempts ?? 0,
    error: row.error ?? null,
    hint: row.hint ?? null,
  };
}

/**
 * The routes of the anonymous usage statistics (`/api/v1/ever-stats/*`). `health` answers signed-in
 * users; every other route answers the operator of the installation only, and 404 to anyone else.
 * No answer ever contains the statistics private key.
 */
@Controller('ever-stats')
export class EverStatsController {
  constructor(
    @Inject(EVER_STATS_CONFIG) private readonly config: EverStatsConfig,
    @Inject(EVER_STATS_CLOCK) private readonly clock: EverStatsClock,
    private readonly instance: EverInstanceService,
    private readonly collector: EverStatsCollectorService,
    private readonly sender: EverStatsSenderService,
    private readonly scheduler: EverStatsSchedulerService,
    private readonly backfill: EverStatsBackfillService,
    private readonly events: EventEmitter2,
  ) {}

  @Get('health')
  @UseGuards(EverSignedInGuard)
  health() {
    return { module: 'ever-stats', loaded: true };
  }

  @Get('status')
  @UseGuards(EverOperatorGuard)
  async status() {
    const record = await this.instance.ensure();
    const schedule = await this.scheduler.readSchedule();
    const uiOn = record.statsEnabledUi !== false;
    const cloud = this.instance.isCloudManaged();
    const enabled = uiOn && this.config.apiUrl !== null;
    let reason: StatsReason = 'env';
    if (cloud) reason = 'cloud-managed';
    else if (!uiOn) reason = 'ui';
    return {
      enabled,
      reason,
      toggleEnabled: uiOn,
      destinationUsable: this.config.apiUrl !== null,
      nextSendAt: enabled
        ? (schedule.nextSendAt ?? this.scheduler.nextAt ?? null)
        : null,
      lastSentAt: schedule.lastSentAt ?? null,
      lastStatus: schedule.lastStatus ?? null,
      instanceId: record.instanceId,
      keyId: record.statsKeyId,
      keyState: this.instance.keyState(record),
      country: this.config.country,
      installSource: this.config.installSource,
      version: this.config.release.version,
      channel: this.config.release.channel,
    };
  }

  /** "What is sent": the report built now, checked, never signed, stored or sent. */
  @Post('preview')
  @HttpCode(200)
  @UseGuards(EverOperatorGuard)
  async preview() {
    const record = await this.instance.ensure();
    const now = this.clock();
    const built = await this.collector.build({
      instanceId: record.instanceId,
      period: monthOf(now),
      final: false,
      now,
    });
    return {
      valid: built.error === null,
      error: built.error,
      payload: built.report,
    };
  }

  @Get('reports')
  @UseGuards(EverOperatorGuard)
  async reports(@Query('limit') limit?: string) {
    const parsed = limit === undefined ? STATS_REPORTS_KEPT : Number(limit);
    if (
      !Number.isInteger(parsed) ||
      parsed < 1 ||
      parsed > STATS_REPORTS_KEPT
    ) {
      throw new BadRequestException(
        `limit is a whole number from 1 to ${STATS_REPORTS_KEPT}`,
      );
    }
    const rows = await this.sender.reports(parsed);
    return { reports: rows.map(reportView) };
  }

  /**
   * *Send now*: 409 while the switch is off, while another report is being sent, and after Ever
   * Platform refused this module version until it is upgraded; at most once per 10 minutes.
   */
  @Post('send')
  @HttpCode(200)
  @UseGuards(EverOperatorGuard)
  async send() {
    try {
      const row = await this.scheduler.sendNow(STATS_SEND_NOW_INTERVAL_MS);
      return { report: reportView(row) };
    } catch (error) {
      const code = (error as Error)?.message;
      if (
        code === 'stats_disabled' ||
        code === 'no_destination' ||
        code === 'busy' ||
        code === 'refused_until_upgrade'
      ) {
        throw new ConflictException({
          statusCode: 409,
          code,
          message: 'Nothing was sent.',
        });
      }
      if (code === 'rate_limited') {
        throw new HttpException(
          {
            statusCode: 429,
            code,
            message: 'Send now can be used once every 10 minutes.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw error;
    }
  }

  @Put('enabled')
  @UseGuards(EverOperatorGuard)
  async setEnabled(@Req() request: any, @Body() body: { enabled?: unknown }) {
    if (typeof body?.enabled !== 'boolean') {
      throw new BadRequestException('enabled must be true or false');
    }
    const enabled = await this.instance.setStatsEnabledUi(
      request.user.id,
      body.enabled,
    );
    return { enabled };
  }

  /** *Recount now*: counts users, workspaces, teams and stored bytes again, in the background. */
  @Post('recount')
  @HttpCode(202)
  @UseGuards(EverOperatorGuard)
  async recount(@Req() request: any) {
    const at = this.clock();
    await this.instance.audit('stats.recount', null, null, request.user.id, at);
    this.events.emit(EVER_INSTANCE_EVENTS.recount, {
      actorUid: request.user.id,
      at,
    });
    void this.backfill.start(true);
    return { started: true };
  }

  /** A new instance id and a new statistics key; the stored report history is cleared. */
  @Post('reset-identity')
  @HttpCode(200)
  @UseGuards(EverOperatorGuard)
  async resetIdentity(@Req() request: any) {
    const record = await this.instance.resetIdentity(request.user.id);
    return this.instance.publicView(record);
  }
}
