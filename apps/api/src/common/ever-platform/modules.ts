import { EverInstanceModule } from '../../module/ever-instance/ever-instance.module';
import { EverStatsModule } from '../../module/ever-stats/ever-stats.module';
import { Env, isEverStatsEnabled, Warn } from './env';

/**
 * The optional Ever Platform modules `AppModule` imports, decided from the environment when the
 * import list is built (after `ConfigModule.forRoot()` loaded the `.env` file):
 *
 * - the anonymous usage statistics and the instance identity they need, unless
 *   `EVER_STATS_ENABLED=false` (exactly).
 */
export function everPlatformModules(env: Env = process.env, warn?: Warn) {
  const statsEnabled = isEverStatsEnabled(env, warn);
  return [
    ...(statsEnabled ? [EverInstanceModule] : []),
    ...(statsEnabled ? [EverStatsModule] : []),
  ];
}
