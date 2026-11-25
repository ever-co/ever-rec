import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { EverSignedInGuard } from '../../ever-instance/ever-operator.guard';
import { EverConnectPlatformErrorsInterceptor } from '../ever-connect.errors';
import { EverConnectOperatorGuard } from '../guards/ever-connect.guards';
import { EverConnectAuditService } from '../services/ever-connect-audit.service';
import { EverConnectIntegrationsService } from '../services/ever-connect-integrations.service';
import { EverConnectManagedService } from '../services/ever-connect-managed.service';
import { EverConnectSchedulerService } from '../services/ever-connect-scheduler.service';
import { EverConnectService } from '../services/ever-connect.service';

type Body_ = Record<string, unknown> | undefined;

const uidOf = (request: any): string => request.user.id;

/**
 * The operator's routes (`/api/v1/ever-connect/*`): connect, disconnect, key rotation, status,
 * instance policy, the public address, integration switch-offs and the audit trail. `health`
 * answers any signed-in user; every other route answers the operator of a self-hosted
 * installation only, and 404 to anyone else.
 */
@Controller('ever-connect')
@UseInterceptors(EverConnectPlatformErrorsInterceptor)
export class EverConnectAdminController {
  constructor(
    private readonly connect: EverConnectService,
    private readonly integrations: EverConnectIntegrationsService,
    private readonly scheduler: EverConnectSchedulerService,
    private readonly audit: EverConnectAuditService,
    private readonly managed: EverConnectManagedService,
  ) {}

  @Get('managed')
  @UseGuards(EverConnectOperatorGuard)
  managedSettings() {
    return this.managed.view();
  }

  @Put('managed')
  @UseGuards(EverConnectOperatorGuard)
  setManaged(@Body() body: Body_, @Req() request: any) {
    return this.managed.update(body, uidOf(request));
  }

  @Get('health')
  @UseGuards(EverSignedInGuard)
  health() {
    return { module: 'ever-connect', loaded: true };
  }

  @Get('status')
  @UseGuards(EverConnectOperatorGuard)
  status() {
    return this.connect.status();
  }

  @Post('connect')
  @HttpCode(200)
  @UseGuards(EverConnectOperatorGuard)
  connectWithCode(@Body() body: Body_, @Req() request: any) {
    return this.connect.connect(body?.code, body?.workspaceId, uidOf(request));
  }

  @Post('disconnect')
  @HttpCode(200)
  @UseGuards(EverConnectOperatorGuard)
  disconnect(@Req() request: any) {
    return this.connect.disconnect(uidOf(request));
  }

  @Post('rotate-key')
  @HttpCode(200)
  @UseGuards(EverConnectOperatorGuard)
  rotateKey(@Req() request: any) {
    return this.connect.rotateKey(uidOf(request));
  }

  @Post('entitlement/refresh')
  @HttpCode(200)
  @UseGuards(EverConnectOperatorGuard)
  async refresh(@Req() request: any) {
    await this.scheduler.refresh(uidOf(request));
    return this.connect.status();
  }

  @Get('policy')
  @UseGuards(EverConnectOperatorGuard)
  policy() {
    return this.integrations.policyView();
  }

  @Put('policy')
  @UseGuards(EverConnectOperatorGuard)
  setPolicy(@Body() body: Body_, @Req() request: any) {
    if (typeof body?.key !== 'string' || typeof body?.allowed !== 'boolean') {
      throw new BadRequestException({
        statusCode: 400,
        code: 'invalid_policy',
      });
    }
    return this.integrations.setPolicy(body.key, body.allowed, uidOf(request));
  }

  @Put('public-url')
  @UseGuards(EverConnectOperatorGuard)
  setPublicUrl(@Body() body: Body_, @Req() request: any) {
    return this.integrations.setPublicUrl(body?.url, uidOf(request));
  }

  @Get('integrations')
  @UseGuards(EverConnectOperatorGuard)
  catalog() {
    return this.integrations.catalog();
  }

  @Post('integrations/refresh')
  @HttpCode(200)
  @UseGuards(EverConnectOperatorGuard)
  async refreshIntegrations(@Req() request: any) {
    await this.integrations.refresh(uidOf(request));
    return this.integrations.catalog();
  }

  @Get('integrations/:key/consent-url')
  @UseGuards(EverConnectOperatorGuard)
  consentUrl(@Param('key') key: string) {
    return this.integrations.consentUrl(key);
  }

  @Post('integrations/:key/disable')
  @HttpCode(200)
  @UseGuards(EverConnectOperatorGuard)
  disable(@Param('key') key: string, @Req() request: any) {
    return this.integrations.disable(key, uidOf(request));
  }

  @Post('integrations/:key/accept')
  @HttpCode(200)
  @UseGuards(EverConnectOperatorGuard)
  accept(@Param('key') key: string, @Body() body: Body_, @Req() request: any) {
    if (typeof body?.accepted !== 'boolean') {
      throw new BadRequestException({
        statusCode: 400,
        code: 'invalid_accept',
      });
    }
    return this.integrations.accept(key, body.accepted, uidOf(request));
  }

  @Get('audit')
  @UseGuards(EverConnectOperatorGuard)
  async auditRows(
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return {
      rows: await this.audit.rows({
        limit: Number(limit) || 50,
        before: typeof before === 'string' && before ? before : undefined,
      }),
    };
  }
}
