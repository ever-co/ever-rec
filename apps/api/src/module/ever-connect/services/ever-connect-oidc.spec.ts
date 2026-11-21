/** The Ever ID client handed to the sign-in module: read at boot, then re-read with a short cache. */
import { seal } from '../ever-connect.crypto';
import {
  EVER_CONNECT_OIDC_REFRESH_MS,
  EVER_CONNECT_OIDC_REFRESH_WAIT_MS,
  EverConnectOidcService,
  StoredOidcClient,
} from './ever-connect-oidc.service';

const KEY = 'test-only-key-of-this-installation-0001';
const INSTANCE = '01JTESTINSTANCE';
const CLIENT: StoredOidcClient = {
  issuer: 'https://auth.ever.co',
  clientId: 'rec-client-1',
  clientSecret: 'client-value-1',
  redirectUrl: 'https://rec-api.example.test/api/v1/auth/ever-id/callback',
};

function sealed(value: StoredOidcClient): string {
  return seal(JSON.stringify(value), KEY, INSTANCE, 'oidc-config');
}

/** Lets every pending promise job run (native promise jobs are never faked). */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    await Promise.resolve();
  }
}

function setup() {
  const clock = { now: 1_000_000 };
  const state = {
    connection: {
      status: 'active',
      registryInstanceId: INSTANCE,
      oidcConfigEnc: sealed(CLIENT) as string | null,
    } as Record<string, unknown> | null,
    enabled: true,
    failing: false,
  };
  const store = {
    connection: jest.fn(async () => {
      if (state.failing) throw new Error('database unavailable');
      return state.connection;
    }),
    integration: jest.fn(async () => {
      if (state.failing) throw new Error('database unavailable');
      return { key: 'ever_id_login', enabled: state.enabled };
    }),
    patchConnection: jest.fn(async () => undefined),
  };
  const service = new EverConnectOidcService(
    store as any,
    {
      installSource: 'self_hosted',
      operatorUids: new Set<string>(),
      recJwtSecret: KEY,
    } as any,
    () => clock.now,
  );
  return { service, store, state, clock };
}

describe('EverConnectOidcService', () => {
  it('reads the stored client at boot, only while ever_id_login is enabled', async () => {
    const { service, state } = setup();
    await service.load();
    expect(service.view.enabled).toBe(true);
    expect(service.view.issuer).toBe('https://auth.ever.co');
    expect(service.view.clientId).toBe('rec-client-1');
    // Serialized, the view says only whether a client is there.
    expect(JSON.stringify(service.view)).toBe('{"enabled":true}');

    state.enabled = false;
    await service.load();
    expect(service.view.enabled).toBe(false);
    expect(service.view.issuer).toBeUndefined();
  });

  it('re-reads on refresh only once the cached read is old enough', async () => {
    const { service, store, state, clock } = setup();
    state.enabled = false;
    await service.load();
    expect(service.view.enabled).toBe(false);
    expect(store.connection).toHaveBeenCalledTimes(1);

    // Another API process recorded the consent and stored the client.
    state.enabled = true;
    clock.now += EVER_CONNECT_OIDC_REFRESH_MS - 1;
    await service.view.refresh!();
    expect(store.connection).toHaveBeenCalledTimes(1);
    expect(service.view.enabled).toBe(false);

    clock.now += 1;
    await service.view.refresh!();
    expect(store.connection).toHaveBeenCalledTimes(2);
    expect(service.view.enabled).toBe(true);

    // Withdrawn elsewhere: gone at the next read.
    state.enabled = false;
    clock.now += EVER_CONNECT_OIDC_REFRESH_MS;
    await service.refresh();
    expect(service.view.enabled).toBe(false);
  });

  it('shares one read between concurrent refreshes', async () => {
    const { service, store, clock } = setup();
    await service.load();
    clock.now += EVER_CONNECT_OIDC_REFRESH_MS;
    await Promise.all([
      service.refresh(),
      service.refresh(),
      service.refresh(),
    ]);
    expect(store.connection).toHaveBeenCalledTimes(2);
  });

  it('keeps the last known client when a later read fails, and waits before trying again', async () => {
    const { service, store, state, clock } = setup();
    await service.load();
    state.failing = true;
    clock.now += EVER_CONNECT_OIDC_REFRESH_MS;
    await service.refresh();
    expect(service.view.enabled).toBe(true);
    const reads = store.connection.mock.calls.length;
    await service.refresh();
    expect(store.connection).toHaveBeenCalledTimes(reads);
  });

  it('a read that does not answer delays a request by at most the wait; the last client serves', async () => {
    jest.useFakeTimers();
    try {
      const { service, store, state, clock } = setup();
      await service.load();
      store.integration.mockImplementationOnce(
        () => new Promise<never>(() => undefined),
      );
      state.enabled = false;
      clock.now += EVER_CONNECT_OIDC_REFRESH_MS;
      let done = false;
      const waiting = service.refresh().then(() => {
        done = true;
      });
      // Synchronous advances plus a microtask flush: the API's test environment resolves to
      // jest-environment-node 27 (hoisted), whose fake timers have no `advanceTimersByTimeAsync`.
      // The wait's timer is set synchronously inside refresh(), so a synchronous advance reaches it.
      jest.advanceTimersByTime(EVER_CONNECT_OIDC_REFRESH_WAIT_MS - 1);
      await settle();
      expect(done).toBe(false);
      jest.advanceTimersByTime(1);
      await waiting;
      expect(service.view.enabled).toBe(true);
      // The next requests do not wait for it again before the interval.
      const reads = store.connection.mock.calls.length;
      await service.refresh();
      expect(store.connection).toHaveBeenCalledTimes(reads);
    } finally {
      jest.useRealTimers();
    }
  });

  it('a boot read that fails, or a value that cannot be decrypted, counts as no client', async () => {
    const failing = setup();
    failing.state.failing = true;
    await failing.service.load();
    expect(failing.service.view.enabled).toBe(false);

    const unreadable = setup();
    unreadable.state.connection = {
      status: 'active',
      registryInstanceId: 'another-instance',
      oidcConfigEnc: sealed(CLIENT),
    };
    await unreadable.service.load();
    expect(unreadable.service.view.enabled).toBe(false);
  });

  it('a save or clear made while a read is on its way wins over that read', async () => {
    const { service, store, state, clock } = setup();
    state.enabled = false;
    await service.load();
    clock.now += EVER_CONNECT_OIDC_REFRESH_MS;

    // The read sees the old state (no client); the save lands before it returns.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    store.integration.mockImplementationOnce(async () => {
      await gate;
      return { key: 'ever_id_login', enabled: false };
    });
    const reading = service.refresh();
    await service.save(INSTANCE, CLIENT);
    release();
    await reading;
    expect(service.view.enabled).toBe(true);

    clock.now += EVER_CONNECT_OIDC_REFRESH_MS;
    state.enabled = true;
    store.integration.mockImplementationOnce(async () => {
      await gate;
      return { key: 'ever_id_login', enabled: true };
    });
    const second = service.refresh();
    await service.clear();
    await second;
    expect(service.view.enabled).toBe(false);
  });

  it('a read that starts while the clear is being written cannot bring the client back', async () => {
    const { service, store, clock } = setup();
    await service.load();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    store.patchConnection.mockImplementationOnce(async () => {
      await gate;
    });
    const clearing = service.clear();
    // The read sees the client still stored (the write has not landed).
    clock.now += EVER_CONNECT_OIDC_REFRESH_MS;
    await service.refresh();
    release();
    await clearing;
    expect(service.view.enabled).toBe(false);
  });
});
