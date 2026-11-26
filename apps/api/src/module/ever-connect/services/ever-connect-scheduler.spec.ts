/** The scheduler's timers (fake timers, stub services). */
import { readEverConnectConfig } from '../ever-connect.config';
import { EverConnectSchedulerService } from './ever-connect-scheduler.service';

const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

function scheduler(
  env: Record<string, string> = {},
  connection: unknown = { status: 'active', registryInstanceId: '01J' },
) {
  const config = readEverConnectConfig(env, () => undefined);
  const calls: string[] = [];
  const store = {
    connection: jest.fn(async () => connection),
    envCode: jest.fn(async () => null),
    patchConnection: jest.fn(async () => undefined),
    sweepPersonExports: jest.fn(async () => 0),
    sweepPersonRequests: jest.fn(async () => 0),
  };
  const lease = {
    acquire: jest.fn(async () => true),
    release: jest.fn(async () => undefined),
  };
  const client = {
    run: jest.fn(async (work: any) => {
      calls.push('heartbeat');
      return work({ instances: { heartbeat: async () => ({}) } });
    }),
  };
  const feed = {
    cycle: jest.fn(async () => {
      calls.push('feed');
      return { received: 0, handled: 0, hasMore: false, acked: null };
    }),
  };
  const entitlements = { refreshAll: jest.fn(async () => ({ ok: true })) };
  const integrations = {
    refresh: jest.fn(async () => undefined),
    denied: jest.fn(async () => new Set()),
    retryPendingRevokes: jest.fn(async () => undefined),
    retryFailedSends: jest.fn(async () => undefined),
  };
  const links = { retryPendingUnlinks: jest.fn(async () => undefined) };
  const connect = {
    connectWithEnvCode: jest.fn(async () => 'skipped'),
    checkApproval: jest.fn(),
  };
  const service = new EverConnectSchedulerService(
    config,
    () => Date.now(),
    true,
    store as any,
    lease as any,
    client as any,
    connect as any,
    entitlements as any,
    integrations as any,
    links as any,
    feed as any,
    {
      syncExistingLinks: jest.fn(async () => undefined),
      retryPersonRequests: jest.fn(async () => 0),
    } as any,
    { retryPendingCompletes: jest.fn(async () => undefined) } as any,
  );
  return { service, calls, feed, connect };
}

describe('EverConnectSchedulerService', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('before a connection exists only local jobs run (no request)', async () => {
    const { service } = scheduler({}, null);
    await service.boot();
    expect(service.scheduled.sort()).toEqual(['sweep', 'watch']);
    service.stop();
  });

  it('starts the timers once another process connected', async () => {
    const connection: { value: unknown } = { value: null };
    const { service } = scheduler({ EVER_CONNECT_FEED_MODE: 'interval' }, null);
    (service as any).store.connection = jest.fn(async () => connection.value);
    await service.boot();
    connection.value = { status: 'active', registryInstanceId: '01J' };
    jest.advanceTimersByTime(5 * 60 * 1000);
    await flush();
    expect(service.scheduled).toEqual(
      expect.arrayContaining(['heartbeat', 'feed', 'refresh']),
    );
    service.stop();
  });

  it('with a first-start code and no connection, only that job runs', async () => {
    const { service, connect } = scheduler(
      { EVER_CONNECT_CODE: 'EVC-AAAA-BBBB-CCCC' },
      null,
    );
    await service.boot();
    expect(service.scheduled.sort()).toEqual(['envCode', 'sweep', 'watch']);
    jest.advanceTimersByTime(10_000);
    await flush();
    expect(connect.connectWithEnvCode).toHaveBeenCalledTimes(1);
    service.stop();
  });

  it('one heartbeat within 5 minutes of a start', async () => {
    const { service, calls } = scheduler({
      EVER_CONNECT_FEED_MODE: 'interval',
    });
    await service.boot();
    for (let i = 0; i < 30; i += 1) {
      jest.advanceTimersByTime(10_000);
      await flush();
    }
    expect(calls.filter((call) => call === 'heartbeat')).toHaveLength(1);
    service.stop();
    expect(service.scheduled).toEqual([]);
  });

  it('interval mode reads the feed once per 15 minutes', async () => {
    const { service, feed } = scheduler({ EVER_CONNECT_FEED_MODE: 'interval' });
    await service.boot();
    jest.advanceTimersByTime(20_000);
    await flush();
    expect(feed.cycle).toHaveBeenCalledTimes(1);
    expect(feed.cycle).toHaveBeenLastCalledWith(0);
    for (let i = 0; i < 100; i += 1) {
      jest.advanceTimersByTime(10_000);
      await flush();
    }
    expect(feed.cycle).toHaveBeenCalledTimes(2);
    service.stop();
  });
});
