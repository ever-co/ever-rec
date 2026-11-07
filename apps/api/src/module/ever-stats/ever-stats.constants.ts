/**
 * The wire contract of the anonymous usage statistics (`ever.stats.v1`), in one place.
 *
 * The header names, the signature prefix and the size limit come from the vendored SDK constants
 * (`schema/constants.json`), never typed by hand here.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface VendoredConstants {
  contracts_version: string;
  stats_headers: { key: string; signature: string; key_id: string };
  stats_signature_prefix: string;
  stats: {
    send_interval_s: number;
    min_interval_s: number;
    max_bytes: number;
    final_resend_days: number[];
    reports_per_day: number;
  };
}

/** The folder of the vendored contract files (copied next to the compiled module by `nest build`). */
export const STATS_SCHEMA_DIR = join(__dirname, 'schema');

const CONSTANTS = JSON.parse(
  readFileSync(join(STATS_SCHEMA_DIR, 'constants.json'), 'utf8'),
) as VendoredConstants;

/** The one outbound call of this module: `POST {EVER_STATS_API_URL}/v1/stats/reports`. */
export const STATS_REPORTS_PATH = '/v1/stats/reports';

/** The default Ever Platform API origin. */
export const DEFAULT_STATS_API_URL = 'https://api.ever.co';

/** The report signature headers: the statistics public key, the signature and the key id. */
export const STATS_HEADERS = Object.freeze({
  key: CONSTANTS.stats_headers.key,
  signature: CONSTANTS.stats_headers.signature,
  keyId: CONSTANTS.stats_headers.key_id,
});

/** `Ever-Stats-Signature: ed25519=<base64url signature>`. */
export const STATS_SIGNATURE_PREFIX = CONSTANTS.stats_signature_prefix;

/** The largest report body, in bytes (16 KiB). */
export const MAX_STATS_REPORT_BYTES = CONSTANTS.stats.max_bytes;

/** The days of a month on which the previous month is sent once more with `final: true`. */
export const FINAL_RESEND_DAYS: ReadonlyArray<number> = Object.freeze([
  ...CONSTANTS.stats.final_resend_days,
]);

/** The default and the shortest public interval between two reports, in seconds. */
export const DEFAULT_SEND_INTERVAL_S = CONSTANTS.stats.send_interval_s;
export const MIN_PUBLIC_SEND_INTERVAL_S = CONSTANTS.stats.min_interval_s;

/** The version of the contract the vendored files come from (sent in the `User-Agent`). */
export const CONTRACTS_VERSION = CONSTANTS.contracts_version;

/** The schema id every report carries. */
export const STATS_SCHEMA_ID = 'ever.stats.v1';

/** The version of this module, sent as `module_version`. */
export const MODULE_VERSION = '1.0.0';

/** The product this module reports for. */
export const PRODUCT = 'rec';

/** The request timeout of a send. */
export const STATS_SEND_TIMEOUT_MS = 10_000;

/** The waits after a failed send (429, 5xx, no answer): +1 h, +4 h, +12 h; then the next day. */
export const STATS_RETRY_DELAYS_S: ReadonlyArray<number> = Object.freeze([
  3600, 14400, 43200,
]);

/** How many report rows are kept. */
export const STATS_REPORTS_KEPT = 12;

/** "Send now" may be used once per 10 minutes. */
export const STATS_SEND_NOW_INTERVAL_MS = 10 * 60 * 1000;

/** The sending lease lasts 10 minutes. */
export const STATS_LEASE_MS = 10 * 60 * 1000;

/** The first report after a restart when the last one is more than a day old. */
export const STATS_OVERDUE_DELAY_MS = 10 * 60 * 1000;

/** Realtime Database paths of the module. */
export const STATS_PATHS = Object.freeze({
  root: 'ever_stats',
  totals: 'ever_stats/counters/totals',
  periods: 'ever_stats/counters/periods',
  backfill: 'ever_stats/counters/backfill',
  reports: 'ever_stats/reports',
  lease: 'ever_stats/lease',
  schedule: 'ever_stats/schedule',
});
