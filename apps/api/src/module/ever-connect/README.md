# `ever-connect`: Ever Platform connection

Connects this installation to Ever Platform: a connect code, workspace links to Ever organizations,
verified entitlement documents, consented integrations (`instance_url`, `stats_link`,
`ever_id_login`), the event feed, and a linked person's export and deletion requests. The public
description, the settings and what is sent are in
[`docs/ever-platform/ever-platform-connection.md`](../../../../../docs/ever-platform/ever-platform-connection.md)
and [`docs/ever-platform/outbound-calls.md`](../../../../../docs/ever-platform/outbound-calls.md).

Loaded by `AppModule` (through `src/common/ever-platform/modules.ts`) only with
`EVER_CONNECT_ENABLED=true`; otherwise its code is not even required. It needs `ever-instance` (the
connect key lives beside the statistics key in `ever_instance/self`) and loads it.

Every request leaves through the SDK client (`@ever-co/connect-sdk`, pinned) and the injected
`fetch`: there is no other HTTP call in this folder. The SDK and this folder are importable only from
here (`apps/api/.eslintrc.js`); the rest of the API injects the optional tokens of
`src/common/ever-platform/tokens.ts` and `module/ever-id/ever-id.tokens.ts`.

## Files

| File | What it does |
|---|---|
| `ever-connect.module.ts` | Wires the providers and controllers; `@Global()` so the two optional tokens can be injected |
| `ever-connect.config.ts` | Reads `EVER_CONNECT_CODE`, `EVER_CONNECT_INTEGRATIONS_DENY`, `EVER_CONNECT_FEED_MODE`, `EVER_PLATFORM_API_URL`, `EVER_INSTALL_SOURCE`, `API_BASE_URL` and the API version |
| `ever-connect.types.ts` | Realtime Database paths and records, audit actions |
| `ever-connect.crypto.ts` | AES-256-GCM sealing of the Ever ID client settings and of exports |
| `ever-connect.tokens.ts` | Clock, `fetch`, autostart and local-platform tokens (tests replace them) |
| `ever-connect.errors.ts` | Failures of Ever Platform answered as 502 (or the right 4xx) with a code only, on every route of the module |
| `ever-connect.routes.json` | The list of the module's routes (checked by `test/route-table.e2e-spec.ts`) |
| `integrations/` | The three definitions, read from the SDK contracts; `definitions.drift.spec.ts` pins their bytes |
| `guards/` | Operator (404 for anyone else, and on Ever Cloud) and workspace admin (403) |
| `controllers/` | Operator, workspace and personal routes |
| `services/ever-connect-store.service.ts` | Typed access to `ever_connect/*` |
| `services/ever-connect-audit.service.ts` | The audit trail (no e-mail address or secret; last 1,000 rows) |
| `services/ever-connect-lease.service.ts` | `ever_connect/lease`: one API process does the background work |
| `services/ever-connect-client.service.ts` | The SDK client over the connect key; key set; entitlement verification |
| `services/ever-connect-entitlement.service.ts` | Entitlement documents and the ladder (`valid`, `grace`, `paused`, `revoked`) |
| `services/ever-connect.service.ts` | Connect, first-start code, disconnect, revocation, key rotation |
| `services/ever-connect-links.service.ts` | Workspace links; the `everHandle` reader |
| `services/ever-connect-integrations.service.ts` | Catalog, policy, consent links, switch-offs, and what each integration sends |
| `services/ever-connect-oidc.service.ts` | The Ever ID client settings handed to the Ever ID module |
| `services/ever-connect-person.service.ts` | Person links; export and deletion requests and their receipts (`EVER_CONNECT_PERSON_EXPORT_ENABLED`, `EVER_CONNECT_PERSON_DELETION_ENABLED`) |
| `services/ever-connect-provision.service.ts` | Ever Rec cloud provisioning (hand-off; `EVER_CONNECT_PROVISION_ENABLED`) |
| `services/ever-connect-managed.service.ts` | Maintenance operations with the operator's opt-in (health report, backup, backup check) |
| `services/ever-connect-feed.service.ts` | Reads, handles once and acknowledges the event feed |
| `services/ever-connect-scheduler.service.ts` | Heartbeat, entitlement refresh, feed loop, first-start code, lease renewal |

## Realtime Database

| Path | What |
|---|---|
| `ever_connect/connection` | The connection (no secret except the encrypted Ever ID client settings) |
| `ever_connect/env_code` | A hash of the first-start code, once used |
| `ever_connect/entitlement` | The installation's entitlement document, as received |
| `ever_connect/links/{workspaceId}` | One workspace link, with its entitlement document |
| `ever_connect/integrations/{key}` | The state of one integration, as Ever Platform reported it |
| `ever_connect/policy/{key}` | The operator's policy |
| `ever_connect/public_url` | The address for `instance_url` |
| `ever_connect/feed_cursor`, `ever_connect/feed_seen` | The feed position; event ids already handled |
| `ever_connect/key_set` | The verified key manifest |
| `ever_connect/person_exports/{jobId}` | A person's export, encrypted, 7 days |
| `ever_connect/person_requests/{jobId}` | A person's request: what it matched, the receipt decided, when it was answered (90 days) |
| `ever_connect/audit`, `ever_connect/lease` | The audit trail; the lease |

## Tests

- `pnpm --filter ever-rec-api exec jest src/module/ever-connect src/module/ever-instance src/app.module.ever-platform`
- `pnpm --filter ever-rec-api exec jest --config ./test/jest-e2e.json test/ever-connect test/route-table`

The end-to-end suites run against an in-process stand-in of the Ever Platform API
(`test/support/fake-ever-platform.ts`): it signs its key manifest and entitlement documents with TEST
keys made for each run and records every request, so the suites assert what leaves the installation.
