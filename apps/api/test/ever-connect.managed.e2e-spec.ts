/**
 * Maintenance operations requested from app.ever.co: nothing runs without the organization's
 * consent and the operator's opt-in, for an allowed kind, inside a window; the platform receives
 * status and sizes only.
 */
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EVER_CONNECT_PATHS } from '../src/module/ever-connect/ever-connect.types';
import { ConnectTestApp, createConnectTestApp } from './support/ever-connect-app';
import { fakeUlid } from './support/fake-ever-platform';
import {
  EverConnectManagedService,
  inWindow,
} from '../src/module/ever-connect/services/ever-connect-managed.service';

describe('maintenance windows', () => {
  const at = (iso: string) => Date.parse(iso);
  const saturdayNight = [{ days: [6], from: '22:00', to: '02:00' }];
  it('an overnight window runs from the chosen day into the next morning', () => {
    expect(inWindow(saturdayNight, at('2026-11-21T23:00:00Z'))).toBe(true); // Saturday 23:00
    expect(inWindow(saturdayNight, at('2026-11-22T01:00:00Z'))).toBe(true); // Sunday 01:00
    expect(inWindow(saturdayNight, at('2026-11-21T01:00:00Z'))).toBe(false); // Saturday 01:00
    expect(inWindow(saturdayNight, at('2026-11-22T03:00:00Z'))).toBe(false);
  });
});
import { CONNECT_ON, connectInstallation, readFeed } from './support/ever-connect-flows';

const ALL_WEEK = [{ days: [0, 1, 2, 3, 4, 5, 6], from: '00:00', to: '23:59' }];

describe('managed operations', () => {
  let t: ConnectTestApp;
  let operator: string;
  let dir: string;

  const request = (kind: string) => {
    const operationId = fakeUlid();
    const nowS = Math.floor(t.clock.now / 1000);
    t.platform.publish('ever.registry.managed_operation.requested', {
      operation_id: operationId,
      org_id: t.platform.instance.orgId,
      instance_id: t.platform.instance.id,
      kind,
      params: {},
      not_before: new Date((nowS - 60) * 1000).toISOString(),
      expires_at: new Date((nowS + 86400) * 1000).toISOString(),
    });
    return operationId;
  };
  const resultOf = (id: string) => t.platform.managedResults.find((r) => r.id === id);
  const optIn = (body: Record<string, unknown>) =>
    t.http().put('/api/v1/ever-connect/managed').set('idToken', operator).send(body);

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'rec-managed-'));
    t = await createConnectTestApp({ env: CONNECT_ON });
    operator = await connectInstallation(t);
  });
  afterEach(async () => {
    rmSync(dir, { recursive: true, force: true });
    await t?.close();
  });

  it('without the consent, or without the opt-in, nothing runs and the answer is failed', async () => {
    await optIn({ optIn: true, kinds: ['backup'], windows: ALL_WEEK, backupDir: dir });
    const noConsent = request('backup');
    await readFeed(t);
    expect(resultOf(noConsent)).toMatchObject({ status: 'failed' });
    expect(readdirSync(dir)).toEqual([]);

    t.platform.setIntegration('managed_operations', 'enabled', true);
    await optIn({ optIn: false });
    const noOptIn = request('backup');
    await readFeed(t);
    expect(resultOf(noOptIn)).toMatchObject({ status: 'failed' });
    expect(readdirSync(dir)).toEqual([]);
    const history = t.firebase.db.dump(EVER_CONNECT_PATHS.managedHistory);
    expect(
      Object.values(history)
        .map((row: any) => String(row.reason))
        .sort((a, b) => a.localeCompare(b)),
    ).toEqual([
      'no_consent',
      'no_operator_opt_in',
    ]);
  });

  it('outside the operator windows nothing runs', async () => {
    t.platform.setIntegration('managed_operations', 'enabled', true);
    const day = new Date(t.clock.now).getUTCDay();
    await optIn({
      optIn: true,
      kinds: ['backup'],
      windows: [{ days: [(day + 1) % 7], from: '00:00', to: '23:59' }],
      backupDir: dir,
    });
    const id = request('backup');
    await readFeed(t);
    expect(resultOf(id)).toMatchObject({ status: 'failed' });
    expect(readdirSync(dir)).toEqual([]);
  });

  it('a backup, its check and a health report; the platform gets status and sizes only', async () => {
    t.platform.setIntegration('managed_operations', 'enabled', true);
    const settings = await optIn({
      optIn: true,
      kinds: ['backup', 'restore_check', 'health_report'],
      windows: ALL_WEEK,
      backupDir: dir,
    });
    expect(settings.status).toBe(200);
    expect(JSON.stringify(settings.body)).not.toContain(dir);
    expect(settings.body.backupDirSet).toBe(true);

    const backup = request('backup');
    const check = request('restore_check');
    const health = request('health_report');
    await readFeed(t);
    expect(resultOf(backup)).toMatchObject({ status: 'succeeded', size_bytes: expect.any(Number) });
    expect(resultOf(check)).toMatchObject({ status: 'succeeded' });
    expect(resultOf(health)).toMatchObject({ status: 'succeeded', version: expect.any(String) });
    expect(readdirSync(dir).filter((name) => name.endsWith('.json'))).toHaveLength(2);
    const sent = JSON.stringify(t.platform.managedResults);
    expect(sent).not.toContain(dir);
    expect(sent).not.toMatch(/\.json|[\\/]/);
  });

  it('a denied integration runs nothing, even if its stored state is still enabled', async () => {
    t.platform.setIntegration('managed_operations', 'enabled', true);
    await optIn({ optIn: true, kinds: ['backup'], windows: ALL_WEEK, backupDir: dir });
    await readFeed(t);
    t.firebase.db.write(['ever_connect', 'policy', 'managed_operations'], {
      allowed: false,
      setBy: 'uid-operator',
      setAt: t.clock.now,
    });
    const id = request('backup');
    await t.get(EverConnectManagedService).handle({
      type: 'ever.registry.managed_operation.requested',
      data: t.platform.instance.events[t.platform.instance.events.length - 1].data,
    });
    expect(resultOf(id)).toMatchObject({ status: 'failed' });
    expect(readdirSync(dir)).toEqual([]);
  });

  it('update is not run by Ever Rec', async () => {
    t.platform.setIntegration('managed_operations', 'enabled', true);
    await optIn({ optIn: true, kinds: ['backup'], windows: ALL_WEEK, backupDir: dir });
    const id = request('update');
    await readFeed(t);
    expect(resultOf(id)).toMatchObject({ status: 'failed' });
    expect(readdirSync(dir)).toEqual([]);
  });

  it('the settings are the operator\'s only, and not on Ever Cloud', async () => {
    t.seedWorkspace('ws-9', 'uid-admin');
    const admin = await t.signIn('uid-admin');
    expect((await t.http().get('/api/v1/ever-connect/managed').set('idToken', admin)).status).toBe(404);
    const cloud = await createConnectTestApp({ env: { ...CONNECT_ON, EVER_INSTALL_SOURCE: 'cloud' } });
    try {
      const op = await cloud.signIn('uid-operator');
      expect((await cloud.http().get('/api/v1/ever-connect/managed').set('idToken', op)).status).toBe(404);
    } finally {
      await cloud.close();
    }
  });
});
