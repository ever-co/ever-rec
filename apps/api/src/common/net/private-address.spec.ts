import { isPrivateAddress } from './private-address';

describe('isPrivateAddress', () => {
  it.each([
    '127.0.0.1',
    '::1',
    '10.0.4.17',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.180',
    '169.254.1.1',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
  ])('treats %s as private or loopback', (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each([
    '203.0.113.9',
    '8.8.8.8',
    '172.15.0.1',
    '172.32.0.1',
    '192.169.0.1',
    '2001:db8::1',
    '',
  ])('treats %s as public', (address) => {
    expect(isPrivateAddress(address)).toBe(false);
  });
});
