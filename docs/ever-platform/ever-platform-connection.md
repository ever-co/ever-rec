# Ever Platform connection (Ever Rec)

An Ever Rec installation can connect to Ever Platform: each Rec workspace can then be linked to an
Ever organization (`ever.co/<handle>`), the installation receives a signed statement of what that
organization's plan includes, and the organization can enable a few integrations after a recorded
consent in app.ever.co. Everything here is optional. Ever Rec works the same without it, and keeps
working whatever happens to the connection.

- [When nothing is sent](#when-nothing-is-sent)
- [Connect, link, disconnect](#connect-link-disconnect)
- [While connected](#while-connected)
- [Integrations](#integrations)
- [When Ever Platform cannot be reached](#when-ever-platform-cannot-be-reached)
- [A person's export and deletion requests](#a-persons-export-and-deletion-requests)
- [Settings](#settings)
- [What is stored, and where](#what-is-stored-and-where)
- [Ever Rec cloud: workspaces started from app.ever.co](#ever-rec-cloud-workspaces-started-from-appeverco)
- [How to verify it yourself](#how-to-verify-it-yourself)

Every call, with what it carries and what switches it off, is listed in
[outbound-calls.md](outbound-calls.md). The anonymous usage statistics are a separate feature:
[anonymous-usage-statistics.md](anonymous-usage-statistics.md).

## When nothing is sent

- `EVER_CONNECT_ENABLED` unset (the default), or any value other than exactly `true`: the connection
  module is not loaded at all. No route under `/api/v1/ever-connect/*` exists (they answer 404), no
  timer runs, no client is created and its code is not even loaded.
- `EVER_CONNECT_ENABLED=true` and not connected: the routes exist (for the operator), and nothing is
  sent to any Ever host until the operator connects with a code, or until the one-time
  `EVER_CONNECT_CODE` is used at the first start.

Firebase (Google) hosts are a dependency of Ever Rec itself and are not part of this feature. The
anonymous usage statistics are a separate feature with their own switch (`EVER_STATS_ENABLED`): while
they are on, their one daily report also goes to Ever Platform, connected or not.

## Connect, link, disconnect

**Connect (the operator).** The operator of the installation (`SUPER_ADMIN_ACCOUNT_UID` or one of
`EVER_OPERATOR_UIDS`) mints a connect code in app.ever.co, then opens *Settings → Ever Platform →
Connection*, pastes the code (`EVC-XXXX-XXXX-XXXX`) and picks a first workspace they administer.
Connecting sends:

- the product (`rec`), its version, how it was installed (`EVER_INSTALL_SOURCE`, never guessed) and
  whether it is a self-hosted or cloud installation;
- the public half of a **connection key** this installation creates for the purpose;
- the id and the name of the workspace picked.

No address of the installation, no user, no e-mail address and no file is sent. The connection key is
separate from the key of the anonymous usage statistics: the statistics identity never appears in a
connection call (except in the `stats_link` statement, below, and only once consented). Connecting is
refused while `REC_JWT_SECRET` is unset or still the value of `.env.sample`, because the connection
key is stored encrypted with a key derived from it.

A first-start alternative: set `EVER_CONNECT_CODE` before the first start. It is used once, without a
workspace (a workspace admin links one afterwards). Whatever Ever Platform answers, it is not used
again; only a failed connection is retried later.

**Link a workspace (its admin).** The admin of a workspace mints a link code in app.ever.co
(`EVL-XXXX-XXXX-XXXX`) and pastes it in *Organization link*. The workspace's id and name are sent with
it. The workspace then shows its organization's handle and plan. Unlinking tells Ever Platform first;
when it cannot be reached, the workspace is unlinked here at once and Ever Platform is told later.

**Disconnect (the operator).** Ever Platform is told (best effort, 10 seconds), then, whatever it
answered: the connection ends, the entitlement documents are deleted, every integration is switched
off, every workspace link ends and the Ever ID client settings are erased. The anonymous usage
statistics are not affected. Revoking the installation in app.ever.co has the same effect here.

On Ever Cloud (`EVER_INSTALL_SOURCE=cloud`) the operator routes do not exist: the connection is made
with `EVER_CONNECT_CODE` and managed from app.ever.co.

## While connected

| What | When | Carries |
|---|---|---|
| Instance token | before it expires (hourly) | a client assertion signed with the connection key; the token stays in memory, never stored or logged |
| Key manifest (`/.well-known/ever-keys.json`) | once a day, and on an unknown key | nothing; the manifest is verified against the root keys built into the SDK |
| Heartbeat | within 5 minutes of a start, then daily | the version, the product (`rec`), the integrations the operator denies |
| Entitlement documents | every 6 hours, at start, on a notice of the feed | nothing; each document is verified before it is stored |
| Event feed | a long poll (`EVER_CONNECT_FEED_MODE=longpoll`, the default) or one read every 15 minutes (`interval`) | the position read so far |

Only one API process works at a time (a lease in the Realtime Database), however many run.

## Integrations

Nothing is enabled in Ever Rec itself: an integration is enabled by an owner or admin of the
organization in app.ever.co, after reading what it sends and receives, and the consent is recorded
there. *Integrations & data* shows each integration's state and its scope (what moves, where, how
often, why, for how long), opens the consent screen of app.ever.co, and lets the operator switch an
integration off at any time. All three are installation-wide.

| Integration | What it does | What it sends |
|---|---|---|
| `instance_url` (Installation address) | The organization's pages link to this installation | the address the operator enters, only once consented |
| `stats_link` (Link usage statistics) | Ties the anonymous usage statistics of this installation to the organization | the statistics instance id and public key, in a statement signed with the statistics key; never offered on Ever Cloud |
| `ever_id_login` (Sign in with Ever ID) | Adds Ever ID as a sign-in option | the API's sign-in callback and sign-out addresses; later, for each user who links an Ever ID, the user's id, the Ever ID and the workspace id and name (never an e-mail address) |

The Ever ID client that Ever Platform prepares is stored encrypted and used by the Ever ID sign-in
module from its next start; its own `EVER_ID_*` settings always win.

**Instance policy.** The operator can deny an integration for every workspace in *Integrations &
data*, or with `EVER_CONNECT_INTEGRATIONS_DENY` (the server configuration wins). A denied integration
that was enabled is switched off at once, and Ever Platform is told.

**Revoking.** In app.ever.co (*Integrations & data* of the organization), or here. A switch-off made
here while Ever Platform cannot be reached takes effect here at once and reaches Ever Platform at the
next heartbeat.

## When Ever Platform cannot be reached

Ever Rec never depends on Ever Platform: uploads, sharing, workspaces and sign-in work the same in
every state below. Only Ever Platform features (the handle, the integrations) are affected.

| State | When | What the admin sees |
|---|---|---|
| valid | the last entitlement document has not expired (7 days) | the handle and plan |
| grace | expired less than 30 days ago | "Entitlements could not be refreshed since <date>"; features stay on |
| paused | expired 30 days ago or more, or no document | "Reconnect to Ever Platform"; Ever Platform features pause |
| revoked | the installation was revoked in app.ever.co | the connection ended |

## A person's export and deletion requests

When a person who linked an Ever ID to a Rec account asks app.ever.co to export or delete their Ever
ID, the request reaches this installation through the event feed (as a hash of the Ever ID, never an
e-mail address):

- **Export**: a JSON file with the account's profile (name, e-mail, photo), its Ever ID links, its
  workspaces and the list of its own images and videos (titles and dates, no files), stored encrypted
  for 7 days and downloadable only by that account (`GET /api/v1/ever-connect/me/exports/<id>`).
  Ever Platform receives the receipt `exported`.
- **Deletion**: the Ever ID links of the account are removed; the Rec account itself stays, for the
  person to delete in Rec. Ever Platform receives the receipt `anonymised`.

An Ever ID this installation does not know gets the receipt `no_account`.

## Settings

| Variable | Default | What it does |
|---|---|---|
| `EVER_CONNECT_ENABLED` | unset (off) | `true` (exactly) loads the connection module |
| `EVER_CONNECT_CODE` | unset | a connect code used once at the first start |
| `EVER_CONNECT_INTEGRATIONS_DENY` | unset | integrations denied for every workspace (`instance_url`, `stats_link`, `ever_id_login`, or `*`) |
| `EVER_CONNECT_FEED_MODE` | `longpoll` | `interval` reads the feed every 15 minutes instead (for proxies that cut long requests) |
| `EVER_PLATFORM_API_URL` | `https://api.ever.co` | the Ever Platform API; plain `http` only for a local address |
| `EVER_INSTALL_SOURCE` | `self-hosted` | how the installation was set up; `cloud` only on Ever Cloud |
| `SUPER_ADMIN_ACCOUNT_UID`, `EVER_OPERATOR_UIDS` | | who operates the installation |
| `NEXT_PUBLIC_EVER_CONNECT_ENABLED` (portal, at build time) | unset | `true` shows the Connect tabs, which also need the API's connection loaded |
| `EVER_CONNECT_PROVISION_ENABLED` | unset (off) | `true` (Ever Rec cloud only) opens the provision routes for workspaces started from app.ever.co |

The portal reads `NEXT_PUBLIC_EVER_CONNECT_ENABLED` when it is built (`.deploy/portal/Dockerfile`
build argument), not when it runs.

## What is stored, and where

Everything lives in the Realtime Database of the installation, under `ever_connect/` (the database
rules deny every client read and write), plus the connection key beside the statistics key in
`ever_instance/self`:

- the connection (its id at Ever Platform, its status, the last heartbeat) and the workspace links;
- the entitlement documents, as received;
- the integration states, the operator's policy and the public address;
- the audit trail (who connected, linked, consented, switched off, changed the policy; the last 1,000
  rows; no e-mail address and no secret);
- the connection key and the Ever ID client secret, encrypted with AES-256-GCM under a key derived
  from `REC_JWT_SECRET`.

Unsetting `EVER_CONNECT_ENABLED` and restarting leaves this data in place, unused; setting it again
reuses the connection.

Changing `REC_JWT_SECRET` makes the stored connection key and the Ever ID client settings unreadable
(they are not re-encrypted), so the connection stops working. To change it: disconnect, change the
secret, then connect again with a new code (a connection key the new secret cannot read is replaced
by a new one when you connect).

## Ever Rec cloud: workspaces started from app.ever.co

On Ever Rec cloud (`EVER_CONNECT_PROVISION_ENABLED=true`, off everywhere else: the routes answer 404),
a person who starts an organization on app.ever.co can choose Ever Rec and land on
`<portal>/ever-connect/provision#intent=…`. Nothing is created until they confirm there:

1. The page reads the intent from the address fragment (never from a query string, so it never
   reaches a server log) and posts it to `POST /api/v1/ever-connect/provision/intent`. The API checks
   the signature (a key of Ever Platform's key set for this purpose), that it is meant for Ever Rec
   and this installation, its times and that it was not used before, and answers a sealed
   confirmation with the organization's name and handle. Nothing is created.
2. The person signs in with the same Ever ID they used on app.ever.co ("Continue with Ever ID";
   another Ever ID is refused with "Sign in with the same Ever ID you used on app.ever.co").
3. "Create workspace <name> linked to ever.co/<handle> in Ever Rec?" *Create* makes one workspace
   with that person as its admin, links it to the organization and tells Ever Platform (the
   workspace id, the account id and the portal address; never an e-mail address). Using the same link
   again answers that the workspace exists. *Decline* tells Ever Platform that nothing was created.

## How to verify it yourself

- With `EVER_CONNECT_ENABLED` unset, `GET /api/v1/ever-connect/health` answers 404.
- With it set and not connected, watch the API's traffic (for example with `tcpdump` on its
  container, with `EVER_STATS_ENABLED=false` so the statistics report does not show up): nothing goes
  to an Ever host until you connect.
- After connecting, *Settings → Ever Platform → Audit* lists every change, and every request matches a
  row of [outbound-calls.md](outbound-calls.md).
