import { describe, expect, it } from '@jest/globals';
import { videoDurationConverter } from '../videoDuration';

describe('videoDurationConverter', () => {
  it.each([
    [0, '00:00'],
    [5, '00:05'],
    [59, '00:59'],
    [60, '01:00'],
    [125, '02:05'],
    [3599, '59:59'],
  ])('keeps the MM:SS format under an hour: %s -> %s', (length, expected) => {
    expect(videoDurationConverter(length)).toBe(expected);
  });

  it('truncates fractional seconds', () => {
    expect(videoDurationConverter(61.9)).toBe('01:01');
  });

  it.each([
    [3600, '01:00:00'],
    [3905, '01:05:05'],
    [86399, '23:59:59'],
    [86400, '24:00:00'],
    [360000, '100:00:00'],
  ])('keeps the hours once a video reaches one hour: %s -> %s', (length, expected) => {
    expect(videoDurationConverter(length)).toBe(expected);
  });

  it.each([NaN, Infinity, -Infinity, -5])(
    'does not throw on invalid length %s',
    (length) => {
      expect(videoDurationConverter(length)).toBe('00:00');
    },
  );
});
