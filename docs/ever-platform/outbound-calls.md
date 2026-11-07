# Outbound calls of the Ever Platform features (Ever Rec)

Every call the optional Ever Platform features of Ever Rec can make, with what it carries and what
switches it off. With `EVER_STATS_ENABLED=false` the API makes none of them: the
[egress audit](../../tools/egress-audit/README.md) proves it on every change.

<!-- BEGIN GENERATED: outbound-calls (rows of the Ever Platform SDK contract list, product "rec", the modules this repository has) -->

| # | Call | Endpoint | When | Carries | Authentication | Switched off by |
|---|---|---|---|---|---|---|
| 17 | Anonymous usage statistics report | `POST <EVER_STATS_API_URL>/v1/stats/reports` (default `https://api.ever.co`) | Statistics module loaded and enabled; once a day at a jittered time; at boot when the last send is older than 24 h; a final re-send of the previous month on days 1-3 | The `ever.stats.v1` document: statistics instance id, product, version, channel, install source, coarse country, month, allow-listed counts, feature flags and integer aggregates | None: the body is signed with the statistics key carried in the signature headers | `EVER_STATS_ENABLED=false`, or the settings toggle |

<!-- END GENERATED: outbound-calls -->

The row number is the one of the SDK's list (`contracts/generated/outbound-calls.json` in
`ever-co/ever-connect-sdk`, contract version 1.0.0-rc.8). See
[anonymous-usage-statistics.md](anonymous-usage-statistics.md) for the report, the schedule and the
answers.

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
