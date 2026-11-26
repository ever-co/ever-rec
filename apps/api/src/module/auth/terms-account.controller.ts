import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AcceptanceStatus } from 'terms-acceptance';
import { TermsAcceptanceService } from '../terms/terms-acceptance.service';
import { getClientIp } from './client-ip';
import { User } from './decorators/user.decorator';
import { TermsReacceptDto } from './dto/auth.dto';
import { AuthGuard, IRequestUser } from './guards/auth.guard';

/**
 * Terms acceptance for a signed-in user (`GET /terms/required` for the sign-up
 * form lives in `TermsModule`, which `AuthModule` imports, so the guarded routes
 * live here to keep the modules acyclic).
 *
 * The portal asks for the status after every sign-in and shows a blocking
 * dialog while `blocking` is not empty: an account whose sign-up record failed
 * (the API keeps the account and only logs that failure) or that has not
 * accepted a material new version.
 */
@Controller('terms')
@UseGuards(AuthGuard)
export class TermsAccountController {
  constructor(
    private readonly termsAcceptanceService: TermsAcceptanceService,
  ) {}

  @Get('status')
  status(
    @User() user: IRequestUser,
    @Query('locale') locale?: string,
  ): Promise<AcceptanceStatus> {
    return this.termsAcceptanceService.status(user.id, locale);
  }

  @Post('accept')
  accept(
    @User() user: IRequestUser,
    @Body() body: TermsReacceptDto,
    @Req() request: Request,
  ): Promise<AcceptanceStatus> {
    return this.termsAcceptanceService.reaccept(user.id, body.documents, {
      ip: getClientIp(request),
      userAgent: request?.headers?.['user-agent'] ?? null,
    });
  }
}
