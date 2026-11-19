# Outbound calls of the Ever Platform features (Ever Rec)

Every call the optional Ever Platform features of Ever Rec can make, with what it carries and what
switches it off. With `EVER_STATS_ENABLED=false` and `EVER_CONNECT_ENABLED` unset the API makes none
of them: the [egress audit](../../tools/egress-audit/README.md) proves it for the statistics on every
change. The calls of the Ever Platform connection (rows other than 17) leave only once the operator
connects the installation: first the redeem of the connect code (row 3, or the one-time
`EVER_CONNECT_CODE` at the first start), then the others
([ever-platform-connection.md](ever-platform-connection.md)).

<!-- BEGIN GENERATED: outbound-calls (rows of the Ever Platform SDK contract list, product "rec", the modules this repository has) -->

| # | Call | Endpoint | When | Carries | Authentication | Switched off by |
|---|---|---|---|---|---|---|
| 1 | Key manifest | `GET /.well-known/ever-keys.json` | first signature verification; every 24 h; an unknown key id | none (read) | none | `EVER_CONNECT_ENABLED` unset; disconnect, or leave EVER_CONNECT_ENABLED unset |
| 3 | Redeem a connect code | `POST /v1/connect/redeem` | the operator submits a connect code; EVER_CONNECT_CODE at first boot | code, product, version, install_source, kind (self_hosted; cloud on deployments Ever operates), serves_products[], public_jwk (the connect key), tenant {product_tenant_id, product_org_id?, display_name}? (absent values are omitted, never sent as null); never the installation's address | none (the connect code) | `EVER_CONNECT_ENABLED` unset; do not connect |
| 4 | Instance token | `POST /v1/instances/token` | while connected: before the token expires, and after a 401 | grant_type, client_assertion_type, client_assertion (issuer and subject are the Ever Platform instance id returned at connect, never the statistics instance id) | client assertion signed with the connect key | `EVER_CONNECT_ENABLED` unset; disconnect |
| 5 | Tenant links | `POST /v1/instances/me/tenant-links`, `DELETE /v1/instances/me/tenant-links/{link}` | an organization admin submits a link code, removes a link, or a single-organization product moves its link to a new organization id | link_code, product, product_tenant_id, product_org_id?, display_name? of the tenant | instance token | `EVER_CONNECT_ENABLED` unset; do not link |
| 6 | Heartbeat and instance status | `POST /v1/instances/me/heartbeat`, `GET /v1/instances/me` | while connected; the status read also while an approval is pending and when an admin opens the connection page | version, module_version?, serves_products[]? (heartbeat); none (status read) | instance token | `EVER_CONNECT_ENABLED` unset; disconnect |
| 7 | Event feed | `GET /v1/instances/me/events`, `POST /v1/instances/me/events/ack` | while connected | cursor only | instance token | `EVER_CONNECT_ENABLED` unset; disconnect |
| 8 | Entitlement documents | `GET /v1/instances/me/entitlement`, `GET /v1/instances/me/tenant-links/{link}/entitlement` | while connected: every 6 h, at boot, on an entitlement notice, on demand | none (read; If-None-Match with the cached sequence number) | instance token (If-None-Match) | `EVER_CONNECT_ENABLED` unset; disconnect |
| 9 | Integration states and consent links | `GET /v1/instances/me/integrations`, `GET /v1/instances/me/consent-url` | after a consent notice; on return from app.ever.co; when an admin opens the integrations tab | integration, link, return (query) | instance token | `EVER_CONNECT_ENABLED` unset; disconnect |
| 10 | Disable an integration locally | `PUT /v1/instances/me/integrations/{key}` | an admin disables an integration locally; an operator policy denies it | enabled: false, reason (instance or policy), tenant_link_id? | instance token | `EVER_CONNECT_ENABLED` unset; none needed: this call only ever disables |
| 11 | Link statistics to the organization | `POST /v1/instances/me/stats-link` | integration stats_link enabled (self-hosted installations only) | stats_instance_id, stats_public_jwk, statement_sig: a statement signed with the separate statistics key, sent under the connect-key token, so app.ever.co can show the installation's last report | instance token | `EVER_CONNECT_ENABLED` unset; disable stats_link |
| 14 | Ever ID sign-in client | `POST /v1/instances/me/oidc-client`, `GET /v1/instances/me/oidc-client` | integration ever_id_login enabled; then a status read until the client is ready | redirect_uri, logout_uri (the sign-in callback and back-channel logout addresses); the answer carries the client id and, once, the client secret | instance token | `EVER_CONNECT_ENABLED` unset; disable ever_id_login (the client is removed on the Ever Platform side) |
| 16 | Disconnect and connect-key rotation | `POST /v1/instances/me/disconnect`, `POST /v1/instances/me/keys` | the operator disconnects; the connect key is rotated | none (disconnect); public_jwk of the new connect key with two rotation proofs, one signed with the current connect key and one with the new key (rotation; the statistics key is never rotated by this call) | instance token | `EVER_CONNECT_ENABLED` unset; none needed: operator action only |
| 17 | Anonymous usage statistics report | `POST <EVER_STATS_API_URL>/v1/stats/reports` (default `https://api.ever.co`) | Statistics module loaded and enabled; once a day at a jittered time; at boot when the last send is older than 24 h; a final re-send of the previous month on days 1-3 | The `ever.stats.v1` document: statistics instance id, product, version, channel, install source, coarse country, month, allow-listed counts, feature flags and integer aggregates | None: the body is signed with the statistics key carried in the signature headers | `EVER_STATS_ENABLED=false`, or the settings toggle |
| 18 | Installation address | `PUT /v1/instances/me/public-url` | integration instance_url enabled in app.ever.co by the organization that owns the connection and accepted by the operator; revoked | base_url (the installation's public address) | instance token | `EVER_CONNECT_ENABLED` unset; disable instance_url (the address is removed from Ever Platform) |
| 19 | Person links | `POST /v1/instances/me/person-links`, `DELETE /v1/instances/me/person-links/{ref}` | a user of the installation links or unlinks Ever ID; a one-time sync of links that existed before the installation connected | product_user_ref (the product's user id), identity_issuer, identity_subject, link_method, product_tenant_id?, product_org_id?, tenant_link_id?, display_name? of the tenant; never an e-mail or a person's name | instance token | `EVER_CONNECT_ENABLED` unset; disable ever_id_login |
| 20 | Receipt for a deletion or export request | `POST /v1/instances/me/ack` | a deletion or export request for a person arrived on the event feed and was handled | job_id, result (deleted, anonymised, retained_legal, no_account, forwarded_to_controller, exported or failed), optional non-identifying detail | instance token | `EVER_CONNECT_ENABLED` unset; disconnect |
| 31 | Operator accepts an installation-wide integration | `POST /v1/instances/me/integrations/{key}/accept` | the operator accepts or declines an installation-wide integration that waits for the local accept | consent_id, accepted | instance token | `EVER_CONNECT_ENABLED` unset; none needed: operator action only |

<!-- END GENERATED: outbound-calls -->

The row number is the one of the SDK's list (`contracts/generated/outbound-calls.json` in
`ever-co/ever-connect-sdk`, contract version 1.0.0-rc.8; the connection rows are its `ROWS` for
product `rec`, limited to the operations `apps/api/src/module/ever-connect` calls). See
[anonymous-usage-statistics.md](anonymous-usage-statistics.md) for the report, the schedule and the
answers, and [ever-platform-connection.md](ever-platform-connection.md) for the connection.

## Inbound routes

The statistics module adds these routes to the API (prefix `/api/v1`; the list is
`apps/api/src/module/ever-stats/ever-stats.routes.json`). With `EVER_STATS_ENABLED=false` none of
them exists.

| Route | Who may call it |
|---|---|
| `GET /ever-stats/health` | Signed-in users (404 for anyone else) |
| `GET /ever-stats/status`, `POST /ever-stats/preview`, `GET /ever-stats/reports`, `POST /ever-stats/send`, `PUT /ever-stats/enabled`, `POST /ever-stats/recount`, `POST /ever-stats/reset-identity` | The operator of the installation (`SUPER_ADMIN_ACCOUNT_UID`, `EVER_OPERATOR_UIDS`); 404 for anyone else |

The portal calls them only from *Settings → Ever Platform*, and asks `health` and `status` once per
page load for a signed-in person to decide whether to show that menu entry.

The connection module adds `/api/v1/ever-connect/*` (the list is
`apps/api/src/module/ever-connect/ever-connect.routes.json`). Without `EVER_CONNECT_ENABLED=true` none
of them exists.

| Route | Who may call it |
|---|---|
| `GET /ever-connect/health` | Signed-in users (404 for anyone else) |
| `GET /ever-connect/status`, `POST /ever-connect/connect`, `POST /ever-connect/disconnect`, `POST /ever-connect/rotate-key`, `POST /ever-connect/entitlement/refresh`, `GET`/`PUT /ever-connect/policy`, `PUT /ever-connect/public-url`, `GET /ever-connect/integrations`, `POST /ever-connect/integrations/refresh`, `GET /ever-connect/integrations/:key/consent-url`, `POST /ever-connect/integrations/:key/disable`, `POST /ever-connect/integrations/:key/accept`, `GET /ever-connect/audit` | The operator of a self-hosted installation; 404 for anyone else and on Ever Cloud (`EVER_INSTALL_SOURCE=cloud`) |
| `GET`/`POST`/`DELETE /ever-connect/workspaces/:workspaceId/link`, `GET …/integrations`, `GET …/integrations/:key/consent-url`, `POST …/refresh`, `GET …/audit` | The admin of that workspace; 403 for other signed-in users |
| `GET /ever-connect/me/exports/:jobId` | The account the export belongs to; 404 for anyone else |

## Operator opt-ins

Features older than the Ever Platform settings that can reach an Ever host are off in the default
configuration of the code and are turned on by the operator:

| Feature | Host | Turned on by |
|---|---|---|
| Sign-in mirrored to an Ever Gauzy server | the server in `GAUZY_API_URL` (`apps/api/.env.sample` pre-fills `https://api.gauzy.co/api`) | setting `GAUZY_API_URL` (empty: off) |
| Product analytics of the existing `analytics.*` events | Segment | `SEGMENT_WRITE_KEY` (empty in `.env.sample`); the listener is not registered in any module today |
| Error reports | the Sentry project in `SENTRY_DSN` | `SENTRY_DSN` (empty in `.env.sample`) |

The portal's web server forwards requests for `/fonts/*` to `https://api.rec.so/fonts/*`
(`apps/portal/next.config.js`), and some pages link to `https://rec.so`. Both predate the Ever
Platform features; they are listed here so the list is complete.
