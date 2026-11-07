import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Redirect,
  Req,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { User } from '../../auth/decorators/user.decorator';
import { AuthGuard, IRequestUser } from '../../auth/guards/auth.guard';
import { sendResponse } from '../../../services/utils/sendResponse';
import { EverIdSettings } from '../ever-id.config';
import { providerDisabled } from '../ever-id.errors';
import { EVER_ID_AVAILABLE, EVER_ID_SETTINGS } from '../ever-id.tokens';
import { EverIdEnabledGuard } from '../guards/ever-id-enabled.guard';
import {
  EverIdRateLimited,
  EverIdRateLimitGuard,
} from '../guards/ever-id-rate-limit.guard';
import {
  EverIdExchangeDto,
  EverIdPendingDto,
  EverIdSignUpConfirmDto,
  EverIdUnlinkDto,
} from '../dto/ever-id.dto';
import { EverIdFlowService } from '../services/ever-id-flow.service';
import { EverIdLogoutService } from '../services/ever-id-logout.service';

/** What the portal and the extension read to decide whether to show the button. */
export interface EverIdPublicConfig {
  enabled: boolean;
  issuer?: string;
  buttonLabel: 'Ever ID';
}

/**
 * Routes of the optional Ever ID sign-in provider, under `/api/v1/auth/ever-id`.
 *
 * Every answer carries `Cache-Control: no-store`. While the provider is off every route except
 * `GET /config` answers 404 `provider_disabled`. No route ever puts a token or an e-mail address in
 * a URL: redirects carry one-time handles only.
 */
@Controller('auth/ever-id')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class EverIdController {
  constructor(
    @Inject(EVER_ID_AVAILABLE) private readonly available: boolean,
    @Inject(EVER_ID_SETTINGS) private readonly settings: EverIdSettings,
    private readonly flow: EverIdFlowService,
    private readonly logout: EverIdLogoutService,
  ) {}

  @Get('config')
  @Header('Cache-Control', 'no-store')
  config(): EverIdPublicConfig {
    if (!this.available) {
      return { enabled: false, buttonLabel: 'Ever ID' };
    }
    return {
      enabled: true,
      issuer: this.settings.issuer,
      buttonLabel: 'Ever ID',
    };
  }

  /** Starts a sign-in: 302 to the issuer's authorization endpoint. */
  @Get('start')
  @UseGuards(EverIdEnabledGuard, EverIdRateLimitGuard)
  @EverIdRateLimited()
  @Header('Cache-Control', 'no-store')
  @Redirect()
  async start(@Query('return') returnPath?: string) {
    return {
      url: await this.flow.startSignIn(returnPath),
      statusCode: HttpStatus.FOUND,
    };
  }

  /** The issuer's redirect back: 302 to the portal with a one-time handle or an error code. */
  @Get('callback')
  @UseGuards(EverIdEnabledGuard, EverIdRateLimitGuard)
  @EverIdRateLimited()
  @Header('Cache-Control', 'no-store')
  @Redirect()
  async callback(
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
  ) {
    return {
      url: await this.flow.callback({ code, state, error }),
      statusCode: HttpStatus.FOUND,
    };
  }

  /** Exchanges a hand-off code (once) for the session; same answer shape as `POST /auth/login-google`. */
  @Post('exchange')
  @UseGuards(EverIdEnabledGuard, EverIdRateLimitGuard)
  @EverIdRateLimited()
  @Header('Cache-Control', 'no-store')
  async exchange(@Body() body: EverIdExchangeDto) {
    return sendResponse(await this.flow.exchange(body.code));
  }

  @Post('sign-up/details')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EverIdEnabledGuard, EverIdRateLimitGuard)
  @EverIdRateLimited()
  @Header('Cache-Control', 'no-store')
  async signUpDetails(@Body() body: EverIdPendingDto) {
    return this.flow.signUpDetails(body.pending);
  }

  /** Creates the account the person confirmed and answers a hand-off code for its session. */
  @Post('sign-up/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EverIdEnabledGuard, EverIdRateLimitGuard)
  @EverIdRateLimited()
  @Header('Cache-Control', 'no-store')
  async signUpConfirm(
    @Body() body: EverIdSignUpConfirmDto,
    @Req() request: Request,
  ) {
    const { code, returnPath } = await this.flow.confirmSignUp(body.pending, {
      terms: body.terms,
      ip: clientIp(request),
      userAgent: request?.headers?.['user-agent'] ?? null,
    });
    return { code, return: returnPath };
  }

  /** Settings → Connect Ever ID: answers the authorization URL (fresh authentication required). */
  @Post('connect/start')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EverIdEnabledGuard, EverIdRateLimitGuard, AuthGuard)
  @EverIdRateLimited()
  @Header('Cache-Control', 'no-store')
  async connectStart(@User() user: IRequestUser) {
    return { authorizationUrl: await this.flow.startConnect(user.id) };
  }

  @Post('connect/details')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EverIdEnabledGuard, EverIdRateLimitGuard, AuthGuard)
  @EverIdRateLimited()
  @Header('Cache-Control', 'no-store')
  async connectDetails(
    @User() user: IRequestUser,
    @Body() body: EverIdPendingDto,
  ) {
    return this.flow.connectDetails(user.id, body.pending);
  }

  @Post('connect/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EverIdEnabledGuard, EverIdRateLimitGuard, AuthGuard)
  @EverIdRateLimited()
  @Header('Cache-Control', 'no-store')
  async connectConfirm(
    @User() user: IRequestUser,
    @Body() body: EverIdPendingDto,
  ) {
    return {
      identities: await this.flow.confirmConnect(user.id, body.pending),
    };
  }

  @Get('identities')
  @UseGuards(EverIdEnabledGuard, AuthGuard)
  @Header('Cache-Control', 'no-store')
  async identities(@User() user: IRequestUser) {
    return { identities: await this.flow.identities(user.id) };
  }

  @Delete('link')
  @UseGuards(EverIdEnabledGuard, AuthGuard)
  @Header('Cache-Control', 'no-store')
  async unlink(@User() user: IRequestUser, @Body() body: EverIdUnlinkDto) {
    return {
      identities: await this.flow.unlink(user.id, body.issuer, body.subject),
    };
  }

  /**
   * OpenID Connect Back-Channel Logout (`application/x-www-form-urlencoded`, `logout_token`).
   * 200 once a valid token was processed; 400 for anything malformed, invalid, too old or replayed.
   */
  @Post('backchannel-logout')
  @UseGuards(EverIdEnabledGuard)
  async backchannelLogout(
    @Body() body: Record<string, unknown>,
    @Res() response: Response,
  ) {
    if (!this.settings.backchannelLogoutEnabled) {
      throw providerDisabled();
    }
    const outcome = await this.logout.handle(body?.logout_token);
    response.setHeader('Cache-Control', 'no-store');
    if (outcome.result === 'ok') {
      response.status(HttpStatus.OK).end();
      return;
    }
    response.status(HttpStatus.BAD_REQUEST).json({ error: 'invalid_request' });
  }
}

/** First hop of `x-forwarded-for`, else the socket address; hashed by the terms recorder, never stored. */
function clientIp(request: Request): string | null {
  const forwarded = request?.headers?.['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof first === 'string' && first.trim()) {
    return first.split(',')[0].trim();
  }
  return request?.ip ?? null;
}
