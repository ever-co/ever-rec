import { Module } from '@nestjs/common';
import { TermsController } from './terms.controller';
import { TermsAcceptanceService } from './terms-acceptance.service';

/**
 * Terms-of-service acceptance.
 *
 * `FirebaseModule` is `@Global()`, so the `FIREBASE_ADMIN` token the service
 * injects is available without importing it here.
 */
@Module({
  controllers: [TermsController],
  providers: [TermsAcceptanceService],
  exports: [TermsAcceptanceService],
})
export class TermsModule {}
