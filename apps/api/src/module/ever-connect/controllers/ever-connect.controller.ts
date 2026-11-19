import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  ConflictException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EverSignedInGuard } from '../../ever-instance/ever-operator.guard';
import { EverConnectWorkspaceAdminGuard } from '../guards/ever-connect.guards';
import { EverConnectAuditService } from '../services/ever-connect-audit.service';
import { EverConnectIntegrationsService } from '../services/ever-connect-integrations.service';
import { EverConnectLinksService } from '../services/ever-connect-links.service';
import { EverConnectPersonService } from '../services/ever-connect-person.service';
import { EverConnectSchedulerService } from '../services/ever-connect-scheduler.service';
import { EverConnectStoreService } from '../services/ever-connect-store.service';

type Body_ = Record<string, unknown> | undefined;

/**
 * A workspace admin's routes (`/api/v1/ever-connect/workspaces/:workspaceId/*`): the workspace's
 * organization link, the integration states (read-only here, with the consent link of
 * app.ever.co), a refresh and the workspace's audit rows. 403 for anyone who is not the
 * workspace's admin.
 */
@Controller('ever-connect/workspaces/:workspaceId')
@UseGuards(EverConnectWorkspaceAdminGuard)
export class EverConnectWorkspaceController {
  constructor(
    private readonly links: EverConnectLinksService,
    private readonly integrations: EverConnectIntegrationsService,
    private readonly scheduler: EverConnectSchedulerService,
    private readonly audit: EverConnectAuditService,
    private readonly store: EverConnectStoreService,
  ) {}

  @Get('link')
  link(@Param('workspaceId') workspaceId: string) {
    return this.links.view(workspaceId);
  }

  @Post('link')
  @HttpCode(200)
  createLink(
    @Param('workspaceId') workspaceId: string,
    @Body() body: Body_,
    @Req() request: any,
  ) {
    return this.links.link(
      workspaceId,
      body?.linkCode,
      request.user.id,
      request.everConnectWorkspace?.name,
    );
  }

  @Delete('link')
  unlink(@Param('workspaceId') workspaceId: string, @Req() request: any) {
    return this.links.unlink(workspaceId, request.user.id);
  }

  @Get('integrations')
  integrationsOf() {
    return this.integrations.catalog();
  }

  /** The consent link, for an admin of a linked workspace (app.ever.co checks who consents). */
  @Get('integrations/:key/consent-url')
  async consentUrl(
    @Param('workspaceId') workspaceId: string,
    @Param('key') key: string,
  ) {
    const link = await this.store.link(workspaceId);
    if (link?.state !== 'active') {
      throw new ConflictException({
        statusCode: 409,
        code: 'not_linked',
        message: 'This workspace is not linked.',
      });
    }
    return this.integrations.consentUrl(key);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Param('workspaceId') workspaceId: string,
    @Req() request: any,
  ) {
    await this.scheduler.refresh(request.user.id);
    return this.links.view(workspaceId);
  }

  @Get('audit')
  async auditRows(
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return {
      rows: await this.audit.rows({
        workspaceId,
        limit: Number(limit) || 50,
        before: before ? Number(before) || undefined : undefined,
      }),
    };
  }
}

/** A person's own export (`ever.registry.person.export_requested`): that account only, else 404. */
@Controller('ever-connect/me')
@UseGuards(EverSignedInGuard)
export class EverConnectPersonController {
  constructor(private readonly person: EverConnectPersonService) {}

  @Get('exports/:jobId')
  download(@Param('jobId') jobId: string, @Req() request: any) {
    return this.person.download(jobId, request.user.id);
  }
}
