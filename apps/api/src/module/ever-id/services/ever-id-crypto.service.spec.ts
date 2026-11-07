import { EverIdCryptoService, hashHandle, isHandle, randomHandle } from './ever-id-crypto.service';

describe('EverIdCryptoService', () => {
  const crypto = new EverIdCryptoService({ get: () => 'a-test-secret' } as any);

  it('opens what it sealed, for the same purpose only', () => {
    const sealed = crypto.seal('ever_id_handoff', { idToken: 'secret-value' });
    expect(sealed).not.toContain('secret-value');
    expect(crypto.open('ever_id_handoff', sealed)).toEqual({ idToken: 'secret-value' });
    expect(crypto.open('ever_id_pending', sealed)).toBeNull();
  });

  it('refuses a tampered record or one sealed with another secret', () => {
    const sealed = crypto.seal('p', { a: 1 });
    const raw = Buffer.from(sealed, 'base64url');
    raw[raw.length - 1] ^= 1;
    expect(crypto.open('p', raw.toString('base64url'))).toBeNull();

    const other = new EverIdCryptoService({ get: () => 'another-secret' } as any);
    expect(other.open('p', sealed)).toBeNull();
    expect(crypto.open('p', 'garbage')).toBeNull();
  });

  it('makes 32-byte random handles and stores only their hash', () => {
    const handle = randomHandle();
    expect(isHandle(handle)).toBe(true);
    expect(handle).toHaveLength(43);
    expect(randomHandle()).not.toBe(handle);
    expect(hashHandle(handle)).not.toBe(handle);
    expect(hashHandle(handle)).toBe(hashHandle(handle));
  });
});
