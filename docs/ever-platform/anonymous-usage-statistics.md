# Anonymous usage statistics (Ever Rec)

Ever Rec can send one small, anonymous report a day about the installation as a whole: how many
users, workspaces and teams it has, how many screenshots and videos were made this month, how much
storage they take, and which two optional features are switched on. It never sends anything about
the people, workspaces, files or links it holds. The report follows the published schema
`ever.stats.v1`, and the code that builds and sends it is in this repository
(`apps/api/src/module/ever-stats`, with the installation identity in
`apps/api/src/module/ever-instance`).

The statistics are on by default and can be switched off at any time (see
[How to disable](#how-to-disable)). Every existing feature works the same with them off.

## What is sent

One document per installation per calendar month (UTC), sent once a day. A complete report:

```json
{
  "schema": "ever.stats.v1",
  "report_id": "5f0c7d0e-3c7c-4a48-9d9f-0f7b3a2b1c11",
  "instance_id": "7c3f0a1e-2b6d-4e0a-9c11-8a2d3e4f5a6b",
  "sent_at": "2026-11-03",
  "module_version": "1.0.0",
  "product": "rec",
  "instance_kind": "backend",
  "serves": ["rec"],
  "version": "0.1.0",
  "channel": "stable",
  "install_source": "self-hosted",
  "country": "ZZ",
  "period": "2026-11",
  "final": false,
  "counts": { "users": 42, "workspaces": 6, "teams": 9 },
  "features": { "gauzy_mirror": false, "google_login": true },
  "aggregates": { "screenshots": 318, "videos": 27, "storage_mb": 15834 }
}
```

### The envelope

| Field | Meaning | Where the value comes from |
|---|---|---|
| `schema` | Always `ever.stats.v1` | constant |
| `report_id` | A random UUID for this report | minted per report |
| `instance_id` | A random UUID that identifies this installation, not a person or a company | created on first start, stored in the Realtime Database (`ever_instance/self`); *Reset instance identity* makes a new one |
| `sent_at` | The UTC day the report was built (no time of day) | clock |
| `module_version` | Version of the statistics module | constant |
| `product`, `instance_kind`, `serves` | `rec`, `backend`, `["rec"]` | constants |
| `version` | The Ever Rec API release, `major.minor.patch` only | `apps/api/package.json`; a pre-release or build suffix is never sent |
| `channel` | `stable`, `rc`, `beta`, `dev` or `custom`, from the version's suffix | `apps/api/package.json` |
| `install_source` | How the installation was set up: `self-hosted` (default), `cloud`, `ever.sh`, `works_app`, `desktop` or `partner:<name>` | `EVER_INSTALL_SOURCE` only; never guessed from a host name or any other signal |
| `country` | Two capital letters declared by the operator, or `ZZ` | `EVER_STATS_COUNTRY` only; never derived from data or addresses |
| `period` | The calendar month (UTC) the numbers describe | clock |
| `final` | `true` for the closed previous month, re-sent once on days 1-3 of the next month | scheduler |

### The Ever Rec lists

| Section | Key | Meaning |
|---|---|---|
| `counts` | `users` | Firebase users of this installation |
| `counts` | `workspaces` | Workspaces |
| `counts` | `teams` | Teams, all workspaces together |
| `features` | `gauzy_mirror` | Whether `GAUZY_API_URL` is set |
| `features` | `google_login` | Whether `GOOGLE_CLIENT_ID` is set |
| `aggregates` | `screenshots` | Screenshots created this month (personal and workspace) |
| `aggregates` | `videos` | Videos created this month |
| `aggregates` | `storage_mb` | Stored media, in whole megabytes |

These are the only keys an Ever Rec report can carry. Counts are whole numbers, features are
`true`/`false`, and every string has a fixed format. There is no name, e-mail address, uid, file
name, storage path, share link, workspace name, URL, host name or free text anywhere, and there
cannot be: the schema is closed at every level, and the module refuses to sign a report that does
not pass it.

### How the numbers are kept

The counts are kept up to date as things happen (a user, workspace, team, screenshot or video is
created or deleted), in `ever_stats/counters` in your Realtime Database. Building a report never
scans your data. The first time the module runs, it counts what already exists once, in the
background; the operator can run that count again with *Recount now*. `storage_mb` between two
recounts follows the uploads and deletes of the media files themselves, so it can drift slightly
from the bucket's real size (thumbnails, for example) until the next recount.

## Before anything is sent

The report is serialised once. Those exact bytes are checked the way Ever Platform checks them (size
at most 16 KiB, strict JSON, the published schema, every string bound to its format, a real
calendar day). A report that fails is stored as `rejected` and never signed or sent.

## When and where

- The first report goes out a day after the first start; after that, once a day at a second drawn
  at random for each day (UTC). When the last report is more than a day old at a restart, the next
  one goes out 10 minutes after the start. On days 1-3 of a month the closed previous month is
  sent once more with `final: true`.
- Several API processes on one Firebase project count as one installation: they share the
  identity and a lease in the Realtime Database, so one of them sends.
- The report goes to `POST <EVER_STATS_API_URL>/v1/stats/reports` (`EVER_STATS_API_URL` defaults to
  `EVER_PLATFORM_API_URL`, then `https://api.ever.co`): exactly the checked bytes, with the headers
  `Ever-Stats-Key` (the installation's statistics public key), `Ever-Stats-Signature`
  (`ed25519=<signature of the exact bytes>`), `Ever-Stats-Key-Id` and
  `User-Agent: ever-connect-sdk/<contract version> (rec/<version>)`. No cookie, no credential, no
  redirect followed, a 10-second limit. The address must be `https`; plain `http` is accepted only
  for a local address (this machine, a private address range or a container name).
- Answers: `202` is recorded as `sent`. `422` is recorded as `rejected` and nothing is sent again
  until the module is upgraded. `409` (Ever Platform knows this instance id with another key) is
  recorded as `rejected` with the hint *Reset instance identity*. `429`, `5xx` and connection errors
  are recorded as `failed` and tried again after 1 hour, 4 hours and 12 hours, then at the next
  day's slot. Any other answer is tried again at the next day's slot.

### The statistics key

On first start the installation makes its own Ed25519 key pair. The private key is stored in the
Realtime Database (`ever_instance/self`) encrypted with AES-256-GCM, under a key derived from your
`REC_JWT_SECRET`; it never appears in a log or an API answer, and the database rules keep every
client away from it. The statistics key is used for nothing else than signing these reports. Set
your own `REC_JWT_SECRET` (the API warns at start while it is the `.env.sample` value). If you change
`REC_JWT_SECRET`, the stored key can no longer be read: nothing is sent until the operator uses
*Reset instance identity*.

## How to disable

| Switch | Effect |
|---|---|
| `EVER_STATS_ENABLED=false` in the API environment, then a restart | The statistics are not loaded at all: no route (`/api/v1/ever-stats/*` answers 404), no timer, no request. The value is compared exactly: anything other than `false` (`FALSE`, `0`, `off`) keeps the default and is logged once at start. |
| *Settings → Ever Platform → Send anonymous usage statistics* off | The module stays loaded so the page works, but no report is built or sent and *Send now* is refused. |

The setting is shown to the operator of the installation only: the uid in `SUPER_ADMIN_ACCOUNT_UID`
and any uid listed in `EVER_OPERATOR_UIDS` (comma separated). Everyone else, workspace admins
included, gets no menu entry and a 404 from the routes. An installation declared with
`EVER_INSTALL_SOURCE=cloud` shows the switch read-only ("Managed by Ever Cloud"): its deployment
decides.

## How to view the last payload

*Settings → Ever Platform* shows the operator:

- the state and the reason (`env`, `ui` or `cloud-managed`), the next and the last send;
- **What is sent**: the report built now, with the same code, without sending it;
- **Last payload**: the exact bytes of the last report, its date, its status and the HTTP answer
  (the last 12 attempts are kept in `ever_stats/reports`);
- **Send now** (at most once every 10 minutes), **Recount now** and **Reset instance identity** (a new
  `instance_id` and a new statistics key; the list of past reports is cleared).

The same is available to the operator from the API:

| Route (`/api/v1/ever-stats/...`) | What it does |
|---|---|
| `GET health` | Signed-in users: whether the module is loaded |
| `GET status` | State, reason, next and last send, instance id, key id, country, install source |
| `POST preview` | What is sent |
| `GET reports?limit=12` | The last reports |
| `POST send` | Send now |
| `PUT enabled` `{"enabled": true \| false}` | The switch |
| `POST recount` | Recount now |
| `POST reset-identity` | Reset instance identity |

Every toggle, recount and reset writes one row to `ever_instance/audit` (the operator's uid, what
changed and when; no IP address, user agent or secret).

## All settings

| Variable | Default | Meaning |
|---|---|---|
| `EVER_STATS_ENABLED` | on | `false` unloads the statistics |
| `EVER_STATS_API_URL` | `EVER_PLATFORM_API_URL`, then `https://api.ever.co` | Where reports go |
| `EVER_STATS_COUNTRY` | `ZZ` | Two capital letters, as the operator declares |
| `EVER_INSTALL_SOURCE` | `self-hosted` | `cloud`, `self-hosted`, `ever.sh`, `works_app`, `desktop` or `partner:<name>` |
| `EVER_OPERATOR_UIDS` | none | Further operators, besides `SUPER_ADMIN_ACCOUNT_UID` |
| `EVER_STATS_SEND_INTERVAL_S` | unset | Tests only; below 3600 only for a local `EVER_STATS_API_URL` |

## Verify it yourself

- Run the API with `EVER_STATS_ENABLED=false` in an isolated Docker setup with no route out and a
  logging DNS resolver: there is no DNS query for any Ever host and no outgoing connection apart
  from your Firebase project. The egress audit in
  [`tools/egress-audit`](../../tools/egress-audit/README.md) does exactly this in CI on every change,
  in three modes (statistics off, loaded but switched off, and on against a local mock of Ever
  Platform), for the API and for the portal in a real browser.
- The tests in `apps/api` check that every object of the schema is closed and every string bound,
  that the vendored schema has not drifted from the published one, that a report built from a seeded
  project full of realistic names, e-mail addresses and file names contains none of them, and that
  the signature verifies over the exact bytes sent.
- Every call the statistics can make is listed in [outbound-calls.md](outbound-calls.md).
