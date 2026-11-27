import { getClientIp } from './client-ip';

const req = (peer: string | undefined, xff?: string | string[]) =>
  ({
    socket: { remoteAddress: peer },
    headers: xff === undefined ? {} : { 'x-forwarded-for': xff },
  }) as any;

describe('getClientIp', () => {
  it('uses the first x-forwarded-for hop when the peer is the ingress (private or loopback)', () => {
    expect(getClientIp(req('10.0.4.17', '203.0.113.9, 10.0.4.1'))).toBe(
      '203.0.113.9',
    );
    expect(getClientIp(req('::ffff:127.0.0.1', '198.51.100.2'))).toBe(
      '198.51.100.2',
    );
    expect(getClientIp(req('fd00::12', ['2001:db8::1']))).toBe('2001:db8::1');
  });

  it('ignores x-forwarded-for from a public peer: the header is then the caller’s own claim', () => {
    expect(getClientIp(req('203.0.113.50', '1.2.3.4'))).toBe('203.0.113.50');
  });

  it('falls back to the socket address, or null when there is none', () => {
    expect(getClientIp(req('10.0.0.5'))).toBe('10.0.0.5');
    expect(getClientIp(req(undefined, '1.2.3.4'))).toBeNull();
  });
});
