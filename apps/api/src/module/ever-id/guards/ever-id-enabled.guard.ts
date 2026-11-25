import { CanActivate, Injectable } from '@nestjs/common';
import { providerDisabled } from '../ever-id.errors';
import { EverIdSettingsService } from '../services/ever-id-settings.service';

/**
 * Answers 404 `provider_disabled` on every Ever ID route while the provider is off. Decided per
 * request: the client of a connected instance may arrive or go away while the API runs.
 */
@Injectable()
export class EverIdEnabledGuard implements CanActivate {
  constructor(private readonly settings: EverIdSettingsService) {}

  async canActivate(): Promise<boolean> {
    await this.settings.refresh();
    if (!this.settings.available) {
      throw providerDisabled();
    }
    return true;
  }
}
