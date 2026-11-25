import {
  EVER_ID_RATE_LIMIT_PER_MINUTE,
  EverIdRateLimitGuard,
} from './ever-id-rate-limit.guard';

describe('EverIdRateLimitGuard', () => {
  it('allows 10 requests a minute per route and address, then answers with a wait time', () => {
    const guard = new EverIdRateLimitGuard({} as any);
    const now = 1_000_000;
    for (let i = 0; i < EVER_ID_RATE_LIMIT_PER_MINUTE; i++) {
      expect(guard.take('start|1.2.3.4', now)).toBe(0);
    }
    expect(guard.take('start|1.2.3.4', now)).toBeGreaterThan(0);
    // Another address and another route have their own buckets.
    expect(guard.take('start|5.6.7.8', now)).toBe(0);
    expect(guard.take('exchange|1.2.3.4', now)).toBe(0);
    // One token comes back every 6 s.
    expect(guard.take('start|1.2.3.4', now + 6_000)).toBe(0);
    expect(guard.take('start|1.2.3.4', now + 6_000)).toBeGreaterThan(0);
  });

  it('trusts a forwarding header only from a proxy, and only its last entry', () => {
    const guard = new EverIdRateLimitGuard({} as any);
    const from = (remoteAddress: string, forwarded?: string) => ({
      socket: { remoteAddress },
      headers: forwarded ? { 'x-forwarded-for': forwarded } : {},
    });
    // Exposed directly: the header is ignored, whatever it says.
    expect(guard.clientAddress(from('203.0.113.7', '198.51.100.1'))).toBe(
      '203.0.113.7',
    );
    // Behind a proxy on a private address: the entry that proxy appended.
    expect(guard.clientAddress(from('10.0.0.5', 'spoofed, 198.51.100.1'))).toBe(
      '198.51.100.1',
    );
    expect(guard.clientAddress(from('::ffff:127.0.0.1', '198.51.100.2'))).toBe(
      '198.51.100.2',
    );
    expect(guard.clientAddress(from('10.0.0.5'))).toBe('10.0.0.5');
  });

  it('leaves routes without the marker alone', () => {
    const guard = new EverIdRateLimitGuard({ get: () => undefined } as any);
    const context = {
      getHandler: () => function config() {},
      switchToHttp: () => ({}),
    };
    expect(guard.canActivate(context as any)).toBe(true);
  });
});
