import { Controller, Get, Query } from '@nestjs/common';
import type { RequiredDocument } from 'terms-acceptance';
import { TermsAcceptanceService } from './terms-acceptance.service';

@Controller('terms')
export class TermsController {
  constructor(private readonly termsAcceptanceService: TermsAcceptanceService) {}

  /**
   * The legal documents a new account must accept, as currently published.
   *
   * Unauthenticated by necessity — the signup form reads it before any account
   * exists. (No `AuthGuard` here; guards are applied per-route in this codebase,
   * so leaving it off is what makes the route public.)
   *
   * Serving this rather than hard-coding versions in the client is what makes
   * the value that gates the submit button and the value that is posted back the
   * same object. Dropping it becomes a visible act rather than an omission,
   * which is how the checkbox came to be decorative in the first place.
   */
  @Get('required')
  getRequired(@Query('locale') locale?: string): RequiredDocument[] {
    return this.termsAcceptanceService.getRequiredDocuments(locale);
  }
}
