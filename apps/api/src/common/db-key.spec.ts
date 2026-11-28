import { isDbKey } from './db-key';

describe('isDbKey', () => {
  it('accepts a plain key of 1 to 128 characters', () => {
    expect(isDbKey('ws-1')).toBe(true);
    expect(isDbKey('-Nx_ab9Z')).toBe(true);
    expect(isDbKey('a'.repeat(128))).toBe(true);
  });

  it('refuses what the Realtime Database refuses as a key', () => {
    for (const value of [
      '',
      'a'.repeat(129),
      'a.b',
      'a#b',
      'a$b',
      'a[b',
      'a]b',
      'a/b',
    ]) {
      expect(isDbKey(value)).toBe(false);
    }
  });

  it('refuses control characters', () => {
    expect(isDbKey('a\u0000b')).toBe(false);
    expect(isDbKey('a\u001fb')).toBe(false);
    expect(isDbKey('a\u007fb')).toBe(false);
    expect(isDbKey('a b')).toBe(true);
  });

  it('refuses anything but a string', () => {
    for (const value of [undefined, null, 7, {}, ['a']]) {
      expect(isDbKey(value)).toBe(false);
    }
  });
});
