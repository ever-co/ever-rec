import { CanActivate, Inject, Injectable } from '@nestjs/common';
import { providerDisabled } from '../ever-id.errors';
import { EVER_ID_AVAILABLE } from '../ever-id.tokens';

/** Answers 404 `provider_disabled` on every Ever ID route while the provider is off. */
@Injectable()
export class EverIdEnabledGuard implements CanActivate {
  constructor(@Inject(EVER_ID_AVAILABLE) private readonly available: boolean) {}

  canActivate(): boolean {
    if (!this.available) {
      throw providerDisabled();
    }
    return true;
  }
}
