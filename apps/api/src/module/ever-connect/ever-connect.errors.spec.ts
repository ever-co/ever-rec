/** Failures of Ever Platform become 502 (or the right 4xx), with a code only. */
import { BadRequestException } from '@nestjs/common';
import {
  EgressRefusedError,
  EntitlementError,
  KeyManifestError,
  NotConnectedError,
  ProblemError,
  RateLimitedError,
  ResponseTooLargeError,
  TimeoutError,
} from '@ever-co/connect-sdk';
import { isNetworkFailure, platformFailure } from './ever-connect.errors';

const answerOf = (error: unknown) => {
  const mapped = platformFailure(error);
  return mapped
    ? { status: mapped.getStatus(), body: mapped.getResponse() }
    : null;
};

describe('platformFailure', () => {
  it.each([
    [
      new ProblemError(503, 'unavailable', 'a detail'),
      502,
      'platform_unavailable',
    ],
    [new ProblemError(500, 'unknown'), 502, 'platform_unavailable'],
    [new ProblemError(429, 'rate_limited'), 502, 'platform_rate_limited'],
    [new ProblemError(422, 'validation_failed'), 502, 'platform_refused'],
    [new ProblemError(401, 'credential_revoked'), 409, 'connection_revoked'],
    [new ProblemError(401, 'token_invalid'), 502, 'platform_refused'],
    [new EntitlementError('bad_signature'), 502, 'entitlement_unverified'],
    [new KeyManifestError('bad_signature'), 502, 'platform_keys_unverified'],
    [new TimeoutError(10_000), 502, 'platform_timeout'],
    [new ResponseTooLargeError(65_536), 502, 'platform_answer_too_large'],
    [new EgressRefusedError('redirect'), 502, 'platform_egress_refused'],
    [new EgressRefusedError('absolute_url'), 502, 'platform_egress_refused'],
    [new EgressRefusedError('insecure_base_url'), 422, 'no_platform_url'],
    [new RateLimitedError(60), 429, 'rate_limited'],
    [new NotConnectedError(), 409, 'not_connected'],
    [new TypeError('fetch failed'), 502, 'platform_unreachable'],
  ])('%s answers %i %s', (error, status, code) => {
    expect(answerOf(error)).toEqual({
      status,
      body: { statusCode: status, code },
    });
  });

  it('never carries a message or detail of the platform', () => {
    const body = answerOf(
      new ProblemError(503, 'unavailable', 'internal detail', 'req-1'),
    )!.body;
    expect(Object.keys(body as object).sort()).toEqual(['code', 'statusCode']);
    expect(JSON.stringify(body)).not.toContain('internal detail');
    expect(JSON.stringify(body)).not.toContain('req-1');
  });

  it('leaves every other error alone', () => {
    expect(platformFailure(new BadRequestException())).toBeNull();
    expect(platformFailure(new Error('a bug'))).toBeNull();
    expect(platformFailure(new TypeError('x is not a function'))).toBeNull();
    expect(platformFailure(undefined)).toBeNull();
  });

  it('recognises a failed fetch by name and message', () => {
    expect(isNetworkFailure(new TypeError('fetch failed'))).toBe(true);
    expect(
      isNetworkFailure({ name: 'TypeError', message: 'fetch failed' }),
    ).toBe(true);
    expect(isNetworkFailure(new Error('fetch failed'))).toBe(false);
    expect(isNetworkFailure('fetch failed')).toBe(false);
  });
});
