/**
 * The module verifies entitlement documents with the SDK verifier (the contracts'
 * fixtures: every invalid document is refused with its code) and reads the ladder from the cache.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { KeySet, verifyEntitlement } from '@ever-co/connect-sdk';
import { EverConnectEntitlementService } from './ever-connect-entitlement.service';

const fixtures = join(
  dirname(require.resolve('@ever-co/connect-contracts/package.json')),
  'fixtures',
);
const json = (path: string) =>
  JSON.parse(readFileSync(join(fixtures, path), 'utf8'));

describe('entitlement documents (SDK fixtures)', () => {
  const context = json('entitlement/context.json');
  const expected = json('entitlement/expected.json');
  const roots = json(`entitlement/../${context.roots_file}`).keys;
  const keySet = KeySet.verify(json(`entitlement/../${context.manifest}`), {
    issuer: context.expected_issuer,
    unsafeRootKeys: roots,
    now: context.now,
  });
  const verify = (file: string) => {
    return verifyEntitlement(
      readFileSync(join(fixtures, 'entitlement', file), 'utf8').trim(),
      {
        keySet,
        expectedIssuer: context.expected_issuer,
        expectedInstanceId: context.expected_instance_id,
        expectedSubject:
          context.expected_subject_by_file?.[file] ?? context.expected_subject,
        cached:
          file in (context.cached_by_file ?? {})
            ? context.cached_by_file[file]
            : context.cached,
        now: context.now,
      },
    );
  };

  const invalid = readdirSync(join(fixtures, 'entitlement', 'invalid')).filter(
    (f) => f.endsWith('.jws'),
  );

  it.each(invalid)('invalid/%s is refused with the expected code', (file) => {
    const outcome = expected.fixtures[`invalid/${file}`];
    let thrown: any;
    try {
      verify(`invalid/${file}`);
    } catch (error) {
      thrown = error;
    }
    expect(outcome.valid).toBe(false);
    expect(thrown).toBeDefined();
    expect([outcome.code, ...(outcome.also_acceptable ?? [])]).toContain(
      thrown.code,
    );
  });

  it('valid documents verify, a past exp included (the ladder reads it as grace)', () => {
    expect(verify('valid/instance.jws').status).toBe('valid');
    expect(verify('valid/link.jws').claims.ever.handle).toBe('acme');
    expect(verify('valid/expired-in-grace.jws').status).toBe('stale');
    expect(verify('valid/expired-past-grace.jws').status).toBe('paused');
  });
});

describe('the ladder (fake clock)', () => {
  const at = (now: number) =>
    new EverConnectEntitlementService(
      {} as any,
      {} as any,
      {} as any,
      () => now,
    );
  const stored = {
    jws: 'x',
    seq: 1,
    iat: 1000,
    exp: 2000,
    graceS: 30 * 86400,
    fetchedAt: 1_000_000,
  };

  it('valid before exp, grace until exp + 30 days, then paused; revoked with the connection', () => {
    expect(at(1999_000).ladder(stored, null).state).toBe('valid');
    expect(at(2000_000).ladder(stored, null).state).toBe('grace');
    expect(at((2000 + 30 * 86400 - 1) * 1000).ladder(stored, null).state).toBe(
      'grace',
    );
    expect(at((2000 + 30 * 86400) * 1000).ladder(stored, null).state).toBe(
      'paused',
    );
    expect(at(0).ladder(null, null).state).toBe('paused');
    expect(at(0).ladder(stored, { status: 'revoked' } as any).state).toBe(
      'revoked',
    );
  });
});
