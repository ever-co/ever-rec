/**
 * The integration definitions Rec shows come from the SDK contracts byte for byte. A contract
 * change (scope, wording, availability) fails this test, so it is reviewed here before it reaches
 * the consent rows of an installation.
 */
import { createHash } from 'node:crypto';
import { INTEGRATIONS } from '@ever-co/connect-sdk';
import { REC_INTEGRATION_KEYS } from '../ever-connect.types';
import { definitionOf, isOffered, offeredKeys } from '.';

const PINNED: Record<string, string> = {
  instance_url:
    'f26416b396ee00a2c69665e1b1348e58e851202139e91e89065e37d3d44b23ef',
  stats_link:
    '894e65146993f578506d3d044b2f730d9f1570666c2950bfbdaf4cae9d31c9a0',
  ever_id_login:
    '946a4d203df34e692bb3dd4de9613f60e17e8d177e0c033aeae1c08b7db377e6',
  managed_operations:
    'b6c6a842aa8b8e379861cf28241ea47f9c8717dccaefa94b2b15dc6c248dffde',
};

const digest = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

describe('integration definitions (drift)', () => {
  it.each(REC_INTEGRATION_KEYS)(
    '%s matches the pinned contract bytes',
    (key) => {
      expect(digest((INTEGRATIONS as Record<string, unknown>)[key])).toBe(
        PINNED[key],
      );
    },
  );

  it('a mutated byte fails (control)', () => {
    const copy = JSON.parse(JSON.stringify((INTEGRATIONS as any).instance_url));
    copy.scope[0].purpose += '.';
    expect(digest(copy)).not.toBe(PINNED.instance_url);
  });

  it('offers exactly the Rec keys; stats_link and managed_operations never on Ever Cloud', () => {
    expect(offeredKeys('self-hosted')).toEqual([
      'instance_url',
      'stats_link',
      'ever_id_login',
      'managed_operations',
    ]);
    expect(offeredKeys('cloud')).toEqual(['instance_url', 'ever_id_login']);
    expect(isOffered('stats_link', 'cloud')).toBe(false);
  });

  it('each definition carries its scope table for the read-only view', () => {
    for (const key of REC_INTEGRATION_KEYS) {
      expect(definitionOf(key).scope.length).toBeGreaterThan(0);
    }
  });
});
