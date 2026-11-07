import { EVER_ID_RATE_LIMIT_PER_MINUTE, EverIdRateLimitGuard } from './ever-id-rate-limit.guard';

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

  it('leaves routes without the marker alone', () => {
    const guard = new EverIdRateLimitGuard({ get: () => undefined } as any);
    const context = { getHandler: () => function config() {}, switchToHttp: () => ({}) };
    expect(guard.canActivate(context as any)).toBe(true);
  });
});
