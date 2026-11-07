import { randomUUID } from 'node:crypto';
import {
  EverInstanceKeyError,
  generateStatsKeyPair,
  isWeakSecret,
  keyIdOf,
  publicKeyOfPrivate,
  SAMPLE_REC_JWT_SECRET,
  signBytes,
  unwrapStatsKey,
  verifyBytes,
  wrapStatsKey,
} from './ever-instance.crypto';

describe('statistics key at rest', () => {
  const secret = 'a-test-secret-of-this-installation';
  const instanceId = randomUUID();

  it('makes an Ed25519 key pair: a 43-character public key and an 11-character key id', () => {
    const { publicKey, privateKeyDer } = generateStatsKeyPair();
    expect(publicKey).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(keyIdOf(publicKey)).toMatch(/^[A-Za-z0-9_-]{11}$/);
    expect(publicKeyOfPrivate(privateKeyDer)).toBe(publicKey);
  });

  it('encrypts and decrypts the private key (round trip)', () => {
    const { privateKeyDer } = generateStatsKeyPair();
    const blob = wrapStatsKey(privateKeyDer, secret, instanceId);
    expect(blob).toMatch(/^v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/);
    expect(blob).not.toContain(privateKeyDer.toString('base64url'));
    expect(unwrapStatsKey(blob, secret, instanceId).equals(privateKeyDer)).toBe(true);
  });

  it('fails closed on a tampered ciphertext, another secret or another instance id', () => {
    const { privateKeyDer } = generateStatsKeyPair();
    const blob = wrapStatsKey(privateKeyDer, secret, instanceId);
    const parts = blob.split(':');
    const ct = Buffer.from(parts[3], 'base64url');
    ct[0] ^= 0x01;
    const tampered = [parts[0], parts[1], parts[2], ct.toString('base64url')].join(':');
    const code = (fn: () => unknown) => {
      try {
        fn();
        return 'none';
      } catch (error) {
        return error instanceof EverInstanceKeyError ? error.code : 'other';
      }
    };
    expect(code(() => unwrapStatsKey(tampered, secret, instanceId))).toBe('unreadable');
    expect(code(() => unwrapStatsKey(blob, 'another-secret', instanceId))).toBe('unreadable');
    expect(code(() => unwrapStatsKey(blob, secret, randomUUID()))).toBe('unreadable');
    expect(code(() => unwrapStatsKey('garbage', secret, instanceId))).toBe('malformed');
    expect(code(() => unwrapStatsKey(blob, '', instanceId))).toBe('secret_missing');
  });

  it('error messages carry no key material or secret', () => {
    try {
      unwrapStatsKey('v1:a:b:c', secret, instanceId);
    } catch (error) {
      expect(String((error as Error).message)).not.toContain(secret);
    }
  });

  it('signs exact bytes; one changed byte fails verification', () => {
    const { publicKey, privateKeyDer } = generateStatsKeyPair();
    const bytes = Buffer.from('{"schema":"ever.stats.v1"}');
    const signature = signBytes(privateKeyDer, bytes);
    expect(signature.toString('base64url')).toHaveLength(86);
    expect(verifyBytes(publicKey, bytes, signature)).toBe(true);
    const changed = Buffer.from(bytes);
    changed[5] ^= 0x01;
    expect(verifyBytes(publicKey, changed, signature)).toBe(false);
  });

  it('knows the sample secret', () => {
    expect(isWeakSecret(SAMPLE_REC_JWT_SECRET)).toBe(true);
    expect(isWeakSecret('')).toBe(true);
    expect(isWeakSecret(secret)).toBe(false);
  });
});
