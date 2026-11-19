import { InMemoryFirebaseApp } from '../../../../test/support/in-memory-firebase';
import { EVER_CONNECT_PATHS } from '../ever-connect.types';
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

  it('writes rows with the actor and keeps the last 1,000', async () => {
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
