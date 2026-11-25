import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ACCOUNT_EVENTS,
  AccountDeletedEvent,
} from '../../../common/events/account.events';
import { EverIdLinkService } from './ever-id-link.service';

/**
 * Removes the Ever ID links of a deleted account: `ever_identities/<key>` holds the person's e-mail,
 * Ever ID subject and person id, and `ever_identities_by_uid/<uid>` lists them. Runs whether or not
 * Ever ID sign-in is on now, since links made while it was on stay until removed.
 */
@Injectable()
export class EverIdAccountDeletedListener {
  private readonly logger = new Logger(EverIdAccountDeletedListener.name);

  constructor(private readonly links: EverIdLinkService) {}

  @OnEvent(ACCOUNT_EVENTS.deleted, {
    async: false,
    promisify: true,
    suppressErrors: true,
  })
  async onAccountDeleted(event?: AccountDeletedEvent): Promise<void> {
    if (!event?.uid) {
      return;
    }
    try {
      const removed = await this.links.forgetAllForUser(event.uid);
      if (removed) {
        this.logger.log(
          `ever_id.link result=removed_with_account count=${removed}`,
        );
      }
    } catch (error: any) {
      // A link left behind is still removed when its Ever ID signs in again (see `liveLink`).
      this.logger.error(
        'ever_id.link result=removal_failed_with_account',
        error?.stack ?? String(error),
      );
    }
  }
}
