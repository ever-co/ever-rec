import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  HttpCode,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { EVER_CONNECT_CONFIG, EverConnectConfig } from '../ever-connect.config';
import { EverConnectProvisionService } from '../services/ever-connect-provision.service';

/** The provision routes exist only with `EVER_CONNECT_PROVISION_ENABLED=true` (404 otherwise). */
@Injectable()
export class EverConnectProvisionEnabledGuard implements CanActivate {
  constructor(
    @Inject(EVER_CONNECT_CONFIG) private readonly config: EverConnectConfig,
  ) {}

  canActivate(): boolean {
    if (!this.config.provisionEnabled) throw new NotFoundException();
    return true;
  }
}

/** A small per-address limit on the public provision routes (a few attempts a minute). */
@Injectable()
export class EverConnectProvisionRateGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = String(request?.ip ?? request?.socket?.remoteAddress ?? 'unknown');
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter((at) => now - at < 60_000);
    if (recent.length >= 30) {
      throw new HttpException({ statusCode: 429, code: 'rate_limited' }, 429);
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.hits.clear();
    return true;
  }
}

type Body_ = Record<string, unknown> | undefined;

/**
 * Ever Rec cloud provisioning (`/api/v1/ever-connect/provision/*`), hand-off only: the portal's
 * landing page posts the intent it received from app.ever.co; the person confirms (signed in with
 * the same Ever ID) or declines. Nothing is created before the confirmation.
 */
@Controller('ever-connect/provision')
@UseGuards(EverConnectProvisionEnabledGuard, EverConnectProvisionRateGuard)
export class EverConnectProvisionController {
  constructor(private readonly provision: EverConnectProvisionService) {}

  @Post('intent')
  @HttpCode(200)
  intent(@Body() body: Body_) {
    return this.provision.intent(body?.intent);
  }

  @Post('confirm')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  confirm(@Body() body: Body_, @Req() request: any) {
    return this.provision.confirm(body?.provisionTxn, request.user.id);
  }

  @Post('intents/:jti/reject')
  @HttpCode(200)
  reject(@Param('jti') jti: string, @Body() body: Body_) {
    return this.provision.reject(jti, body?.provisionTxn);
  }
}
