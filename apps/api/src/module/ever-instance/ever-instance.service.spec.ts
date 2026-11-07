import { ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InMemoryFirebaseApp } from '../../../test/support/in-memory-firebase';
import { EverInstanceService } from './ever-instance.service';
import { readEverInstanceSettings } from './ever-instance.settings';
import { EVER_INSTANCE_AUDIT_KEPT, EVER_INSTANCE_EVENTS, EVER_INSTANCE_PATHS } from './ever-instance.types';
import { unwrapStatsKey } from './ever-instance.crypto';

const SECRET = 'test-secret-of-this-installation';

function service(firebase: InMemoryFirebaseApp, env: Record<string, string> = {}, events = new EventEmitter2()) {
  const settings = readEverInstanceSettings((name) => ({ REC_JWT_SECRET: SECRET, SUPER_ADMIN_ACCOUNT_UID: 'uid-op', ...env })[name]);
  return new EverInstanceService(firebase as any, settings, events);
}

describe('EverInstanceService', () => {
  it('creates one identity, even when five callers race', async () => {
    const firebase = new InMemoryFirebaseApp();
    const services = Array.from({ length: 5 }, () => service(firebase));
    const records = await Promise.all(services.map((s) => s.ensure()));
    const ids = new Set(records.map((r) => r.instanceId));
    expect(ids.size).toBe(1);
    const stored = firebase.db.dump(EVER_INSTANCE_PATHS.self);
    expect(stored.instanceId).toBe(records[0].instanceId);
    expect(stored).toMatchObject({ statsEnabledUi: true, resetCount: 0 });
    expect(stored.statsKeyId).toMatch(/^[A-Za-z0-9_-]{11}$/);
    expect(stored.connectPublicKey).toBeUndefined();
  });

  it('stores the private key encrypted only', async () => {
    const firebase = new InMemoryFirebaseApp();
    const s = service(firebase);
    const record = await s.ensure();
    const identity = await s.signingIdentity();
    expect(unwrapStatsKey(record.statsPrivateKeyEnc, SECRET, record.instanceId).equals(identity.privateKeyDer)).toBe(true);
    const dump = JSON.stringify(firebase.db.dump());
    expect(dump).not.toContain(identity.privateKeyDer.toString('base64url'));
    expect(dump).not.toContain(identity.privateKeyDer.toString('base64'));
    expect(JSON.stringify(s.publicView(record))).not.toMatch(/PrivateKey/);
  });

  it('reports an unreadable key after REC_JWT_SECRET changed', async () => {
    const firebase = new InMemoryFirebaseApp();
    const record = await service(firebase).ensure();
    const other = service(firebase, { REC_JWT_SECRET: 'another-secret' });
    expect(other.keyState(record)).toBe('key_unreadable');
    await expect(other.signingIdentity()).rejects.toMatchObject({ code: 'unreadable' });
  });

  it('toggles, writes one audit row and emits the event', async () => {
    const firebase = new InMemoryFirebaseApp();
    const events = new EventEmitter2();
    const seen: unknown[] = [];
    events.on(EVER_INSTANCE_EVENTS.statsToggle, (event) => seen.push(event));
    const s = service(firebase, {}, events);
    await s.setStatsEnabledUi('uid-op', false);
    expect(await s.isStatsEnabledUi()).toBe(false);
    expect(Object.values(firebase.db.dump(EVER_INSTANCE_PATHS.audit))).toEqual([
      { action: 'stats.toggle', from: true, to: false, actorUid: 'uid-op', at: expect.any(Number) },
    ]);
    expect(seen).toEqual([{ actorUid: 'uid-op', from: true, to: false, at: expect.any(Number) }]);
  });

  it('refuses the toggle on Ever Cloud (cloud_managed)', async () => {
    const s = service(new InMemoryFirebaseApp(), { EVER_INSTALL_SOURCE: 'cloud' });
    await expect(s.setStatsEnabledUi('uid-op', false)).rejects.toBeInstanceOf(ConflictException);
    await expect(s.setStatsEnabledUi('uid-op', false)).rejects.toMatchObject({ response: { code: 'cloud_managed' } });
  });

  it('resets: new id and key, switch and other fields kept, audit row and event', async () => {
    const firebase = new InMemoryFirebaseApp();
    const events = new EventEmitter2();
    const seen: unknown[] = [];
    events.on(EVER_INSTANCE_EVENTS.resetIdentity, (event) => seen.push(event));
    const s = service(firebase, {}, events);
    const before = await s.ensure();
    await s.setStatsEnabledUi('uid-op', false);
    await firebase.db.ref(`${EVER_INSTANCE_PATHS.self}/connectKeyId`).set('reserved');
    const after = await s.resetIdentity('uid-op');
    expect(after.instanceId).not.toBe(before.instanceId);
    expect(after.statsPublicKey).not.toBe(before.statsPublicKey);
    expect(after.statsEnabledUi).toBe(false);
    expect(after.resetCount).toBe(1);
    expect(firebase.db.dump(`${EVER_INSTANCE_PATHS.self}/connectKeyId`)).toBe('reserved');
    expect((await s.signingIdentity()).record.instanceId).toBe(after.instanceId);
    const actions = (Object.values(firebase.db.dump(EVER_INSTANCE_PATHS.audit)) as any[]).map((row) => row.action);
    expect(actions).toEqual(['stats.toggle', 'instance.reset_identity']);
    expect(seen).toEqual([{ actorUid: 'uid-op', resetCount: 1, at: expect.any(Number) }]);
  });

  it(`keeps the last ${EVER_INSTANCE_AUDIT_KEPT} audit rows`, async () => {
    const firebase = new InMemoryFirebaseApp();
    const s = service(firebase);
    for (let i = 0; i < EVER_INSTANCE_AUDIT_KEPT + 5; i += 1) {
      await s.audit('stats.recount', null, null, 'uid-op', i);
    }
    const rows = Object.values(firebase.db.dump(EVER_INSTANCE_PATHS.audit)) as any[];
    expect(rows).toHaveLength(EVER_INSTANCE_AUDIT_KEPT);
    expect(Math.min(...rows.map((row) => row.at))).toBe(5);
  });

  it('knows the operators', () => {
    const s = service(new InMemoryFirebaseApp(), { EVER_OPERATOR_UIDS: 'uid-a,uid-b' });
    expect(['uid-op', 'uid-a', 'uid-b', 'uid-c', '', null].map((uid) => s.isOperator(uid))).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
    ]);
  });
});
