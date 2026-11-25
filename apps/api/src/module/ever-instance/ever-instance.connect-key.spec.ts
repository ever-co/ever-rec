import { EventEmitter2 } from '@nestjs/event-emitter';
import { InMemoryFirebaseApp } from '../../../test/support/in-memory-firebase';
import { SAMPLE_REC_JWT_SECRET, verifyBytes } from './ever-instance.crypto';
import {
  EverConnectKeyError,
  EverInstanceService,
} from './ever-instance.service';
import { readEverInstanceSettings } from './ever-instance.settings';
import { EVER_INSTANCE_PATHS } from './ever-instance.types';

const SECRET = 'test-secret-of-this-installation';

const service = (firebase: InMemoryFirebaseApp, secret = SECRET) =>
  new EverInstanceService(
    firebase as any,
    readEverInstanceSettings((name) => ({ REC_JWT_SECRET: secret })[name]),
    new EventEmitter2(),
  );

describe('EverInstanceService: the connect key', () => {
  it('five concurrent callers end up with one connect key, distinct from the statistics key', async () => {
    const firebase = new InMemoryFirebaseApp();
    const keys = await Promise.all(
      Array.from({ length: 5 }, () => service(firebase).ensureConnectKey()),
    );
    expect(new Set(keys.map((key) => key.keyId)).size).toBe(1);
    const self = firebase.db.dump(EVER_INSTANCE_PATHS.self);
    expect(self.connectKeyId).toBe(keys[0].keyId);
    expect(self.connectKeyId).not.toBe(self.statsKeyId);
    expect(self.connectPublicKey).not.toBe(self.statsPublicKey);
    expect(self.connectPrivateKeyEnc).toMatch(/^v1:/);
    expect(JSON.stringify(self)).not.toContain(
      keys[0].privateKeyDer.toString('base64url'),
    );
  });

  it('is refused with the sample REC_JWT_SECRET (at_rest_key_default)', async () => {
    const firebase = new InMemoryFirebaseApp();
    await expect(
      service(firebase, SAMPLE_REC_JWT_SECRET).ensureConnectKey(),
    ).rejects.toEqual(new EverConnectKeyError('at_rest_key_default'));
    expect(firebase.db.dump(EVER_INSTANCE_PATHS.self)).toBeNull();
  });

  it('a reset of the statistics identity keeps the connect key', async () => {
    const firebase = new InMemoryFirebaseApp();
    const s = service(firebase);
    const key = await s.ensureConnectKey();
    await s.resetIdentity('uid-op');
    expect((await s.connectKey())?.keyId).toBe(key.keyId);
  });

  it('a key the current secret cannot read is replaced only when asked (connecting)', async () => {
    const firebase = new InMemoryFirebaseApp();
    const before = await service(
      firebase,
      'first-secret-of-this-install',
    ).ensureConnectKey();
    const changed = service(firebase, 'second-secret-of-this-install');
    await expect(changed.connectKey()).rejects.toEqual(
      new EverConnectKeyError('key_unreadable'),
    );
    await expect(changed.ensureConnectKey()).rejects.toEqual(
      new EverConnectKeyError('key_unreadable'),
    );
    const after = await changed.ensureConnectKey({ replaceUnreadable: true });
    expect(after.keyId).not.toBe(before.keyId);
    expect((await changed.connectKey())?.keyId).toBe(after.keyId);
  });

  it('a rotation replaces the key only once committed', async () => {
    const firebase = new InMemoryFirebaseApp();
    const s = service(firebase);
    const key = await s.ensureConnectKey();
    const next = await s.prepareConnectKeyRotation();
    expect((await s.connectKey())?.keyId).toBe(key.keyId);
    await s.commitConnectKeyRotation(next.keyId);
    expect((await s.connectKey())?.keyId).toBe(next.keyId);
    expect(
      firebase.db.dump(EVER_INSTANCE_PATHS.self).connectNextKeyId,
    ).toBeUndefined();
  });

  it('the stats-link statement is signed by the statistics key', async () => {
    const firebase = new InMemoryFirebaseApp();
    const s = service(firebase);
    const statement = await s.signStatsLinkStatement(
      '01JNE7V9J03J6XQ2WN8H0Z88R5',
      1793613600,
    );
    const [header, payload, signature] = statement.statement_sig.split('.');
    const self = firebase.db.dump(EVER_INSTANCE_PATHS.self);
    expect(
      verifyBytes(
        self.statsPublicKey,
        Buffer.from(`${header}.${payload}`),
        Buffer.from(signature, 'base64url'),
      ),
    ).toBe(true);
    expect(JSON.parse(Buffer.from(payload, 'base64url').toString())).toEqual({
      stats_instance_id: self.instanceId,
      stats_public_jwk: { kty: 'OKP', crv: 'Ed25519', x: self.statsPublicKey },
      sub: '01JNE7V9J03J6XQ2WN8H0Z88R5',
      iat: 1793613600,
    });
  });
});
