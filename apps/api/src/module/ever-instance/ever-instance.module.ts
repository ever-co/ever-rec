import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { AuthGuard } from '../auth/guards/auth.guard';
import { EverInstanceService } from './ever-instance.service';
import { EVER_INSTANCE_SETTINGS, everInstanceSettingsFactory } from './ever-instance.settings';
import { EverOperatorGuard, EverSignedInGuard } from './ever-operator.guard';

/**
 * The anonymous identity of this installation (`ever_instance/self` in the Realtime Database) and
 * the operator check. Loaded only with the anonymous usage statistics (see `app.module.ts`); it
 * makes no outbound request.
 */
@Module({
  imports: [AuthModule],
  providers: [
    {
      provide: EVER_INSTANCE_SETTINGS,
      useFactory: everInstanceSettingsFactory,
      inject: [ConfigService],
    },
    AuthGuard,
    EverInstanceService,
    EverOperatorGuard,
    EverSignedInGuard,
  ],
  exports: [EVER_INSTANCE_SETTINGS, AuthGuard, AuthModule, EverInstanceService, EverOperatorGuard, EverSignedInGuard],
})
export class EverInstanceModule {}
