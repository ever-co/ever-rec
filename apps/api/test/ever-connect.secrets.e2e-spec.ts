/**
 * CN-16: no secret in any answer, log line or stored record. The connect private key and the Ever
 * ID client secret are stored encrypted only; the instance token lives in memory only.
 */
import { Logger } from '@nestjs/common';
import { EVER_CONNECT_PATHS } from '../src/module/ever-connect/ever-connect.types';
import { EverInstanceService } from '../src/module/ever-instance/ever-instance.service';
import { createConnectTestApp } from './support/ever-connect-app';
import { CONNECT_ON, connectInstallation, readFeed, scheduler } from './support/ever-connect-flows';

// `client_secret` as a member (the scope table names the field `oidc.client_secret`, which is fine).
const SECRET_PATTERNS = [
  /PrivateKey/,
  /configEnc/,
  /evit_[A-Za-z0-9_-]+/,
  /"client_?[sS]ecret"\s*:/,
  /test-client-secret-value/,
];

export function findSecrets(texts: string[], extra: string[] = []): string[] {
  const found: string[] = [];
  for (const text of texts) {
    for (const re of SECRET_PATTERNS) if (re.test(text)) found.push(re.source);
    for (const value of extra) if (value && text.includes(value)) found.push('planted');
  }
  return found;
}

describe('CN-16 secrets', () => {
  it('no answer, log line or stored record carries a secret', async () => {
    const logs: string[] = [];
    const spies = (['log', 'warn', 'error', 'debug'] as const).map((level) =>
      jest.spyOn(Logger.prototype, level).mockImplementation((...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
      }),
    );
    const t = await createConnectTestApp({ env: CONNECT_ON });
    try {
      const bodies: string[] = [];
      const operator = await connectInstallation(t);
      t.platform.setIntegration('ever_id_login', 'enabled', true);
      t.platform.setIntegration('instance_url', 'enabled', true);
      await readFeed(t);
      await scheduler(t).heartbeat();
      t.seedWorkspace('ws-2', 'uid-admin');
      const admin = await t.signIn('uid-admin');
      for (const [token, method, path, body] of [
        [operator, 'get', '/api/v1/ever-connect/status', null],
        [operator, 'get', '/api/v1/ever-connect/integrations', null],
        [operator, 'get', '/api/v1/ever-connect/audit', null],
        [operator, 'get', '/api/v1/ever-connect/policy', null],
        [operator, 'post', '/api/v1/ever-connect/rotate-key', null],
        [operator, 'get', '/api/v1/ever-connect/workspaces/ws-1/link', null],
        [admin, 'post', '/api/v1/ever-connect/workspaces/ws-2/link', { linkCode: t.platform.issueLinkCode() }],
        [admin, 'get', '/api/v1/ever-connect/workspaces/ws-2/integrations', null],
      ] as Array<[string, string, string, any]>) {
        const res = await (t.http() as any)[method](path).set('idToken', token).send(body ?? {});
        expect(res.status).toBeLessThan(300);
        bodies.push(res.text);
      }
      const key = await t.get(EverInstanceService).connectKey();
      const der = key!.privateKeyDer;
      const dump = JSON.stringify(t.firebase.db.dump());
      expect(findSecrets(bodies)).toEqual([]);
      expect(findSecrets(logs)).toEqual([]);
      expect(dump).not.toMatch(/evit_/);
      expect(dump).not.toContain('test-client-secret-value');
      expect(dump).not.toContain(der.toString('base64'));
      expect(dump).not.toContain(der.toString('base64url'));
      expect(t.firebase.db.dump(EVER_CONNECT_PATHS.connection).oidcConfigEnc).toMatch(/^v1:/);
      // The token went out as a bearer only.
      expect(JSON.stringify(t.platform.requests.map((r) => r.body))).not.toMatch(/evit_/);
      // Control: the check finds a planted secret.
      expect(findSecrets([`${bodies[0]}"client_secret":"x"`])).toHaveLength(1);
      expect(findSecrets(['abc'], ['abc'])).toEqual(['planted']);
    } finally {
      spies.forEach((spy) => spy.mockRestore());
      await t.close();
    }
  });
});
