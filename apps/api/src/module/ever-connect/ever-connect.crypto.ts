/**
 * How the connection keeps its few secrets at rest (the Ever ID client settings, a person's
 * export): AES-256-GCM with a key derived by HKDF-SHA256 from `REC_JWT_SECRET`, salted with the
 * record's own id and bound to its purpose (also the additional data). A stored value reads
 * `v1:<iv>:<tag>:<ciphertext>`, each part base64url. Nothing here logs or returns key material.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

export type SealPurpose = 'oidc-config' | 'person-export' | 'provision-txn';

/** A sealed value that cannot be opened. Carries no secret. */
export class SealError extends Error {
  constructor(readonly code: 'malformed' | 'secret_missing' | 'unreadable') {
    super(
      `A stored value of the Ever Platform connection cannot be read (${code}).`,
    );
    this.name = 'SealError';
  }
}

function keyFor(secret: string, salt: string, purpose: SealPurpose): Buffer {
  if (!secret) throw new SealError('secret_missing');
  return Buffer.from(
    hkdfSync(
      'sha256',
      Buffer.from(secret, 'utf8'),
      Buffer.from(salt, 'utf8'),
      Buffer.from(`ever-connect/${purpose}`, 'utf8'),
      32,
    ),
  );
}

export function seal(
  plaintext: string,
  secret: string,
  salt: string,
  purpose: SealPurpose,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    'aes-256-gcm',
    keyFor(secret, salt, purpose),
    iv,
  );
  cipher.setAAD(Buffer.from(`ever_connect:${purpose}`, 'utf8'));
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(plaintext, 'utf8')),
    cipher.final(),
  ]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':');
}

export function open(
  blob: string,
  secret: string,
  salt: string,
  purpose: SealPurpose,
): string {
  const parts = typeof blob === 'string' ? blob.split(':') : [];
  if (parts.length !== 4 || parts[0] !== 'v1') throw new SealError('malformed');
  const key = keyFor(secret, salt, purpose);
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(parts[1], 'base64url'),
    );
    decipher.setAAD(Buffer.from(`ever_connect:${purpose}`, 'utf8'));
    decipher.setAuthTag(Buffer.from(parts[2], 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(parts[3], 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new SealError('unreadable');
  }
}

/** Lower-case hex SHA-256 of the UTF-8 text. */
export const sha256Hex = (text: string): string =>
  createHash('sha256').update(text, 'utf8').digest('hex');
