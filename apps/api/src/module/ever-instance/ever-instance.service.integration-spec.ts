import { EventEmitter2 } from '@nestjs/event-emitter';
import type * as admin from 'firebase-admin';
import { clearEmulators, emulatorApp } from '../../../test/setup-emulators';
import { EverInstanceService } from './ever-instance.service';
import { readEverInstanceSettings } from './ever-instance.settings';
import { EVER_INSTANCE_PATHS } from './ever-instance.types';

describe('instance identity on the Realtime Database emulator', () => {
  const apps: admin.app.App[] = [];

  beforeAll(async () => {
    for (let i = 0; i < 5; i += 1) apps.push(emulatorApp());
    await clearEmulators(apps[0]);
  });

  afterAll(async () => {
    await Promise.all(apps.map((app) => app.delete()));
  });

  it('five API processes racing create exactly one identity', async () => {
    const services = apps.map(
      (app) =>
        new EverInstanceService(
          app,
          readEverInstanceSettings(
            (name) => ({ REC_JWT_SECRET: 'integration-secret' })[name],
          ),
          new EventEmitter2(),
        ),
    );
    const records = await Promise.all(
      services.map((service) => service.ensure()),
    );
    expect(new Set(records.map((record) => record.instanceId)).size).toBe(1);
    const stored = (
      await apps[0].database().ref(EVER_INSTANCE_PATHS.self).get()
    ).val();
    expect(stored.instanceId).toBe(records[0].instanceId);
    expect(stored.statsPrivateKeyEnc).toMatch(/^v1:/);
    for (const service of services) {
      expect((await service.signingIdentity()).record.instanceId).toBe(
        stored.instanceId,
      );
    }
  });
});
