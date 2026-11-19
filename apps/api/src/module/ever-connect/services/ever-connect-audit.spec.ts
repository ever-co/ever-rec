import { InMemoryFirebaseApp } from '../../../../test/support/in-memory-firebase';
import {
  EVER_CONNECT_AUDIT_KEPT,
  EVER_CONNECT_PATHS,
} from '../ever-connect.types';
import {
  AuditRefusedError,
  checkAuditDetails,
  EverConnectAuditService,
} from './ever-connect-audit.service';
import { EverConnectStoreService } from './ever-connect-store.service';

describe('ever-connect audit', () => {
  it('refuses e-mail addresses and secret-shaped values', () => {
    expect(() => checkAuditDetails({ who: 'someone@example.com' })).toThrow(
      AuditRefusedError,
    );
    expect(() => checkAuditDetails({ token: 'abc' })).toThrow(
      AuditRefusedError,
    );
    expect(() => checkAuditDetails({ value: 'evit_abcdef' })).toThrow(
      AuditRefusedError,
    );
    expect(() => checkAuditDetails({ value: 'EVC-ABCD-EFGH-JKMN' })).toThrow(
      AuditRefusedError,
    );
    expect(() =>
      checkAuditDetails({ key: 'stats_link', allowed: false }),
    ).not.toThrow();
  });

  it(`keeps the last ${EVER_CONNECT_AUDIT_KEPT} rows`, async () => {
    const firebase = new InMemoryFirebaseApp();
    let at = 0;
    const audit = new EverConnectAuditService(
      new EverConnectStoreService(firebase as any),
      () => ++at,
    );
    for (let i = 0; i < EVER_CONNECT_AUDIT_KEPT + 2; i += 1) {
      await audit.write('entitlement.refresh', 'system', { n: i });
    }
    const rows = Object.values(
      firebase.db.dump(EVER_CONNECT_PATHS.audit),
    ) as Array<{ details: { n: number } }>;
    expect(rows).toHaveLength(EVER_CONNECT_AUDIT_KEPT);
    const kept = rows.map((row) => row.details.n);
    expect(kept).not.toContain(0);
    expect(kept).not.toContain(1);
    expect(kept).toContain(EVER_CONNECT_AUDIT_KEPT + 1);
  });

  it('writes rows with the actor', async () => {
    const firebase = new InMemoryFirebaseApp();
    const audit = new EverConnectAuditService(
      new EverConnectStoreService(firebase as any),
      () => 1000,
    );
    await audit.write('policy.set', 'uid-op', {
      key: 'stats_link',
      allowed: false,
    });
    await expect(
      audit.write('policy.set', 'uid-op', { note: 'a@b.co' }),
    ).rejects.toThrow(AuditRefusedError);
    const rows = Object.values(firebase.db.dump(EVER_CONNECT_PATHS.audit));
    expect(rows).toEqual([
      {
        at: 1000,
        actor: 'uid-op',
        action: 'policy.set',
        details: { key: 'stats_link', allowed: false },
      },
    ]);
  });
});
