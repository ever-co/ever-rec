# `ever-stats`: anonymous usage statistics

One `ever.stats.v1` report a day about this installation as a whole (counts and feature switches
only), signed with the installation's own statistics key and sent to Ever Platform. The public
description, the settings and how to turn it off are in
[`docs/ever-platform/anonymous-usage-statistics.md`](../../../../../docs/ever-platform/anonymous-usage-statistics.md).

Loaded by `AppModule` (through `src/common/ever-platform/modules.ts`) unless
`EVER_STATS_ENABLED=false`; it needs `ever-instance` and loads it.

## Files

| File | What it does |
|---|---|
| `ever-stats.module.ts` | Wires the providers and the controller |
| `ever-stats.config.ts` | Reads `EVER_STATS_API_URL` (or `EVER_PLATFORM_API_URL`), `EVER_STATS_COUNTRY`, `EVER_STATS_SEND_INTERVAL_S`, `EVER_INSTALL_SOURCE`, `GAUZY_API_URL`, `GOOGLE_CLIENT_ID` and the API version; nothing else |
| `ever-stats.constants.ts` | The wire contract: path, header names, size limit (from the vendored `schema/constants.json`) |
| `ever-stats-counters.listener.ts` | Counter events → Realtime Database transactions |
| `ever-stats-backfill.service.ts` | The one-time count and *Recount now* |
| `ever-stats-collector.service.ts` | Builds the report from the counters and checks the exact bytes |
| `ever-stats-validator.ts` | Size, strict JSON, schema (ajv, strict), string walker, calendar day |
| `ever-stats-sender.service.ts` | Signs, stores and posts the report; records the answer; keeps the last 12 |
| `ever-stats-scheduler.service.ts` | Daily slot, first send, `final` re-send, retries, lease, send lock, *Send now* |
| `ever-stats-lease.ts` | The `ever_stats/lease` compare-and-set |
| `ever-stats.controller.ts` | The `/api/v1/ever-stats/*` routes |
| `ever-stats.routes.json` | The list of those routes |
| `schema/` | The vendored contract (schema, constants, fixtures) with `VENDOR.json`; see below |

## Realtime Database

| Path | Content |
|---|---|
| `ever_stats/counters/totals` | `{users, workspaces, teams, storageBytes}`, changed by transactions |
| `ever_stats/counters/periods/{YYYY-MM}` | `{screenshots, videos}` created in that month (UTC); never decremented |
| `ever_stats/counters/backfill` | `{completedAt, byPod}` of the last recount |
| `ever_stats/reports/{reportId}` | `{period, final, payload, signature, createdAt, sentAt, httpStatus, status, attempts, retry, error, hint}`, the last 12 |
| `ever_stats/lease` | `{leasedBy, leaseUntil}`: which API process sends now |
| `ever_stats/schedule` | `{firstBootAt, nextSendAt, lastSentAt, lastStatus, lastFinalSentFor, retryAttempt, blockedModuleVersion, lastManualSendAt}` |

The database rules (`database.rules.json`) deny every client access to `ever_stats` (the root
denies by default); the Admin SDK of the API is the only reader and writer.

## Counter events

Producers emit the neutral events of `src/common/events/ever-counters.events.ts` (a leaf file with
names and payload types only) after a successful write; when this module is not loaded nobody
listens. The producers are `UserService`, `WorkspacesService`, `WorkspaceTeamsService`,
`ImageService`, `VideoService` and `WorkspaceFilesService`. A payload is `{count?}` or
`{kind, bytes}`, never an id, a uid or a path.

## The vendored contract

`schema/` holds byte-for-byte copies of the public Ever Platform SDK's statistics contract
(`ever-co/ever-connect-sdk`, the commit in `VENDOR.json`): `ever.stats.v1.json`, `constants.json` and
the fixtures. `schema.drift.spec.ts` checks every file against the hashes `VENDOR.json` records, and
`schema.meta.spec.ts` checks that every object is closed and every string bound. To update, copy the
files again from a newer SDK commit and update `VENDOR.json`. The files keep LF line endings
(`schema/.gitattributes`).

## Tests

- `npm test -- src/module/ever-stats src/module/ever-instance src/common` (unit, in-memory Firebase
  doubles);
- `npm run test:e2e -- test/ever-stats test/route-table` (every route, canary, full counts, route
  table);
- `npm run test:integration` (Firebase emulators: counters, recount, lease, canary, rules).
