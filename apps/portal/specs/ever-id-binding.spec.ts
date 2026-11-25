import { createHash } from 'crypto';
import {
  clearEverIdBinding,
  createEverIdBinding,
  hashEverIdBinding,
  readEverIdBinding,
} from 'app/services/everIdBinding';

describe('Ever ID tab binding', () => {
  it('hashes like the API (base64url SHA-256)', () => {
    expect(hashEverIdBinding('abc')).toBe('ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0');
    expect(hashEverIdBinding('')).toBe('47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU');
    const value = 'Ab9_-'.repeat(20);
    expect(hashEverIdBinding(value)).toBe(createHash('sha256').update(value).digest('base64url'));
  });

  it('stores a fresh value in this tab and hands out only its hash', () => {
    const getRandomValues = jest.fn((bytes: Uint8Array) => {
      bytes.fill(7);
      return bytes;
    });
    Object.defineProperty(window, 'crypto', { value: { getRandomValues }, configurable: true });

    const hash = createEverIdBinding();
    const stored = readEverIdBinding();
    expect(stored).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash).toBe(hashEverIdBinding(stored as string));
    expect(hash).not.toBe(stored);

    clearEverIdBinding();
    expect(readEverIdBinding()).toBeUndefined();
  });
});
