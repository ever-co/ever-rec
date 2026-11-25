import { EverInstanceModule } from '../../module/ever-instance/ever-instance.module';
import { EverStatsModule } from '../../module/ever-stats/ever-stats.module';
import { Env, isEverConnectEnabled, isEverStatsEnabled, Warn } from './env';

/**
 * The Ever Platform connection module, loaded only when it is switched on: with
 * `EVER_CONNECT_ENABLED` unset its code (and the SDK it uses) is never even required.
 */
function everConnectModule() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../../module/ever-connect/ever-connect.module')
    .EverConnectModule;
}

/**
 * The optional Ever Platform modules `AppModule` imports, decided from the environment when the
 * import list is built (after `ConfigModule.forRoot()` loaded the `.env` file):
 *
 * - the anonymous usage statistics and the instance identity they need, unless
 *   `EVER_STATS_ENABLED=false` (exactly);
 * - the Ever Platform connection, only with `EVER_CONNECT_ENABLED=true` (exactly). It needs the
 *   instance identity too, which is then loaded even when the statistics are off.
 */
export function everPlatformModules(env: Env = process.env, warn?: Warn) {
  const statsEnabled = isEverStatsEnabled(env, warn);
  const connectEnabled = isEverConnectEnabled(env, warn);
  return [
    ...(statsEnabled || connectEnabled ? [EverInstanceModule] : []),
    ...(statsEnabled ? [EverStatsModule] : []),
    ...(connectEnabled ? [everConnectModule()] : []),
  ];
}
