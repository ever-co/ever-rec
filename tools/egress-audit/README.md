# Egress audit

A runtime proof of what the optional anonymous usage statistics of Ever Rec may send: **nothing at
all** when they are off (`EVER_STATS_ENABLED=false`), **not a single call** when they are loaded but
switched off by the operator, and **only the statistics report** when they are on. Every call they
can make is listed in [`docs/ever-platform/outbound-calls.md`](../../docs/ever-platform/outbound-calls.md).

## The harness

The harness is the egress audit of the public Ever Platform SDK (`ever-co/ever-connect-sdk`),
published as the dev-only npm package `@ever-co/connect-tools` (`ever-egress-audit`). The workflow
downloads exactly the version [`harness.json`](harness.json) pins and refuses it unless its integrity
matches; nothing of it is copied here. It runs the compose files below with every Docker bridge
sealed (no route out), makes CoreDNS the only resolver, captures every connection attempt and DNS
question of the API process from before it starts, drives the API from inside the sealed setup, and
fails the run when the API looks up an Ever host, tries to reach anything outside the compose
services, answers a statistics route while the statistics are off, or makes a call its mode does
not allow. In the positive mode a mock of Ever Platform receives the reports and checks that each is
signed and valid.

This directory holds only Ever Rec's inputs:

| File | What it is |
|---|---|
| `egress-audit.config.json` | The API leg: the API as the audited process, the statistics routes probed in `off`, the watched window, the Firebase host names the API may look up (they reach nothing) |
| `docker-compose.audit.yml` | The API image under test (`REC_API_IMAGE`) and the Firebase Emulator Suite (`REC_EMULATORS_IMAGE`) instead of a real Firebase project (`demo-` project, kept local); a random `REC_JWT_SECRET` and a throwaway service-account key per run |
| `emulators.Dockerfile`, `emulators.firebase.json` | The emulators image (Authentication, Realtime Database, Storage), also usable for `npm run test:integration` in `apps/api` |
| `adapter.mjs` | Signs in as the operator through the Authentication emulator, reads the statistics routes, switches the statistics off as the operator (`loaded_off`), signs in through the portal's page (browser leg) |
| `harness.json` | The harness version and integrity |
| `egress-audit.web.config.json`, `compose.web.yml` | The browser leg: the portal image under test as a second audited process, walked page by page in a real browser |
| `ui-routes.json`, `ui-routes-pages.mjs` | Every portal page, generated from the Next.js pages router (`node tools/egress-audit/ui-routes-pages.mjs`; CI checks it with `--check`, with a control that must fail) |
| `route-params.json`, `ui-baseline.json` | Route parameter values of the walk, and the DOM references to Ever hosts that predate the statistics (to be recorded from the first browser-leg run; it may only shrink) |

## Modes (API leg, every change)

| Mode | The API | Passes when |
|---|---|---|
| `off` | `EVER_STATS_ENABLED=false` | no Ever host looked up, no connection attempt out, every `/api/v1/ever-stats/*` route answers 404, and the API log has no `ever_stats.` line |
| `loaded_off` | statistics loaded, switched off by the operator through `PUT /api/v1/ever-stats/enabled`; a local reporting address outside the sealed setup and a 60-second interval | no call at all; the watched window (150 s) is longer than one interval, and the API must have logged `ever_stats.send outcome=skipped_ui_off` (the scheduler ran after the switch-off), so a run in which it never ran fails |
| `positive_stats` | statistics on, reporting to the mock platform every 5 seconds | signed, schema-valid reports accepted (202), no other call |
| control | `positive_stats` without the mock platform | must **fail** (exit 1): a green run is not a blind one |

The job also runs the harness's `cloud-inference` scan over the statistics code (it never guesses
where it runs).

## The browser leg (on demand)

`.github/workflows/egress-audit-browser.yml` (run it from *Actions*) builds the portal with
`NEXT_PUBLIC_API_BASE_URL=http://api:3000`, signs in as the operator through the portal's sign-in
page and opens every page of `ui-routes.json` in `off`, `loaded_off` and `positive_stats`; in
`positive_stats` the settings page must ask `GET /api/v1/ever-stats/status`.

It is expected to fail today, for a reason older than the statistics: the portal's web server
forwards `/fonts/*` to a fixed Ever host (`apps/portal/next.config.js`), every page loads those fonts,
and no setting turns that forwarding off. Making the forwarding target configurable is a separate
change; until then this leg runs on demand only and does not gate pull requests.

## Running it locally

With Docker, Node 22 or later, and the harness (`npm pack @ever-co/connect-tools@<version>` and
install the tarball in a scratch folder):

```sh
docker build -f .deploy/api/Dockerfile -t ever-rec-api:egress-audit .
docker build -f tools/egress-audit/emulators.Dockerfile -t ever-rec-emulators:egress-audit .
export REC_API_IMAGE=ever-rec-api:egress-audit REC_EMULATORS_IMAGE=ever-rec-emulators:egress-audit
export REC_AUDIT_SECRET=$(openssl rand -hex 32)
export REC_AUDIT_FIREBASE_KEY="$(openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048)"
node <harness>/dist/egress-audit/run.mjs --config tools/egress-audit/egress-audit.config.json --mode off --legs api
```

The evidence (`report.json`, pcaps, DNS logs, the API log, the mock's record) lands in
`egress-audit-artifacts/<mode>/`.
