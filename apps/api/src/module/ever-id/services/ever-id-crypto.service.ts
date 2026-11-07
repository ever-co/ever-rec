import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
} from 'crypto';

/** Length of every random handle (state, nonce, PKCE verifier, one-time codes), in bytes. */
export const EVER_ID_RANDOM_BYTES = 32;

/** A fresh random value, base64url (43 characters for 32 bytes). */
export function randomHandle(bytes = EVER_ID_RANDOM_BYTES): string {
  return randomBytes(bytes).toString('base64url');
}

/** SHA-256 of a value, base64url; used as the database key for one-time handles. */
export function hashHandle(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('base64url');
}

/**
 * The key of an Ever ID link: hex SHA-256 of `issuer`, a NUL byte and `subject`. Stable across
 * deployments, so a deletion request that only names the issuer and subject can find the row.
 */
export function identityKey(issuer: string, subject: string): string {
  return createHash('sha256')
    .update(`${issuer}\u0000${subject}`, 'utf8')
    .digest('hex');
}

/** Shape-checks a one-time handle before it is used as a lookup key. */
export function isHandle(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(value);
}

/**
 * Seals short-lived records before they are written to the database.
 *
 * Pending authorizations hold the PKCE verifier and nonce, hand-off records hold a session, and the
 * session index holds reference tokens. None of that is stored in clear: each record is encrypted
 * with AES-256-GCM under a key derived (HKDF-SHA256) from `REC_JWT_SECRET`, and the record's purpose
 * is bound as additional data, so a record cannot be replayed under another purpose.
 */
@Injectable()
export class EverIdCryptoService {
  private readonly key: Buffer;

  constructor(configService: ConfigService) {
    const secret = configService.get<string>('REC_JWT_SECRET') ?? '';
    // The auth module refuses to start without REC_JWT_SECRET; the fallback only keeps this
    // provider constructible in a process where the provider is off and nothing is sealed.
    this.key = Buffer.from(
      hkdfSync(
        'sha256',
        secret || randomBytes(32),
        'ever-rec',
        'ever-id/sealed-records/v1',
        32,
      ),
    );
  }

  seal(purpose: string, value: unknown): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(purpose, 'utf8'));
    const body = Buffer.concat([
      cipher.update(JSON.stringify(value), 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
  }

  /** Opens a sealed record; `null` when it was not sealed by this server for this purpose. */
  open<T>(purpose: string, sealed: unknown): T | null {
    if (typeof sealed !== 'string') {
      return null;
    }
    try {
      const raw = Buffer.from(sealed, 'base64url');
      if (raw.length < 29) {
        return null;
      }
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.key,
        raw.subarray(0, 12),
      );
      decipher.setAAD(Buffer.from(purpose, 'utf8'));
      decipher.setAuthTag(raw.subarray(12, 28));
      const plain = Buffer.concat([
        decipher.update(raw.subarray(28)),
        decipher.final(),
      ]).toString('utf8');
      return JSON.parse(plain) as T;
    } catch {
      return null;
    }
  }
}
