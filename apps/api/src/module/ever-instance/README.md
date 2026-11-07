# `ever-instance`: the anonymous identity of this installation

The identity the anonymous usage statistics report under, and the operator check of the Ever
Platform settings. It makes no outbound request.

## `ever_instance/self`

Created once, under a Realtime Database transaction, the first time it is needed (several API
processes on one Firebase project share it):

| Field | Meaning |
|---|---|
| `instanceId` | A random UUID v4: the `instance_id` of every statistics report |
| `statsPublicKey` | The statistics public key (Ed25519, base64url of the raw 32 bytes) |
| `statsPrivateKeyEnc` | The statistics private key, encrypted (see below) |
| `statsKeyId` | base64url of the first 8 bytes of the SHA-256 of the public key |
| `statsEnabledUi` | The operator's switch (`true` by default) |
| `createdAt`, `resetCount`, `resetAt` | When it was created and reset |

The fields `connectPublicKey`, `connectPrivateKeyEnc` and `connectKeyId` are reserved for a later
Ever Platform connection module; this module never writes them, and a reset keeps them. The
statistics key signs statistics reports and nothing else.

## The key at rest

The private key (PKCS#8 DER) is encrypted with AES-256-GCM. The key is derived with HKDF-SHA256
from `REC_JWT_SECRET`, salted with the `instanceId`, for the purpose `ever-instance/stats-key`
(bound into the ciphertext as additional data). The stored value is `v1:<iv>:<tag>:<ciphertext>`.
A key that cannot be decrypted (for example after `REC_JWT_SECRET` changed) is reported as
`key_unreadable`: nothing is signed or sent until the operator resets the identity. The API logs a
warning at start while `REC_JWT_SECRET` is unset or the `.env.sample` value.

## Reset

*Reset instance identity* writes a new `instanceId` and a new statistics key pair, adds one to
`resetCount`, and keeps the switch and any other field. The statistics module then clears its report
history.

## Operator

The operator of the installation is the uid in `SUPER_ADMIN_ACCOUNT_UID` plus the uids listed in
`EVER_OPERATOR_UIDS` (comma separated). `EverOperatorGuard` runs the existing `AuthGuard` and
answers 404 to a caller who is not signed in and to a signed-in user who is not the operator
(workspace admins included). `EverSignedInGuard` answers 404 to a caller who is not signed in.

## Audit and events

Every switch, recount and reset writes one row to `ever_instance/audit` (`{action, from, to,
actorUid, at}`; the last 200 are kept; no IP address, user agent or secret) and emits an in-process
event (`ever.instance.stats_toggle`, `ever.instance.reset_identity`, `ever.instance.recount`).

`EVER_INSTALL_SOURCE=cloud` makes the switch read-only (`409 cloud_managed`): the deployment decides.
