/** The provider's settings follow the client of a connected instance while the API runs. */
import { EverConnectOidcConfig } from '../ever-id.config';
import { EverIdSettingsService } from './ever-id-settings.service';

const PORTAL = { WEBSITE_URL: 'https://app.example.test' };
const ENV_CLIENT = {
  EVER_ID_ISSUER_URL: 'https://idp.example.test',
  EVER_ID_CLIENT_ID: 'rec-env-client',
  EVER_ID_CLIENT_SECRET: 'env-client-value',
  EVER_ID_REDIRECT_URL: 'https://api.example.test/api/v1/auth/ever-id/callback',
  ...PORTAL,
};

function configOf(env: Record<string, string>) {
  return { get: (name: string) => env[name] } as any;
}

/** A connection whose client changes while the API runs (like the Ever Platform connection's view). */
function connection(): EverConnectOidcConfig & {
  refresh: jest.Mock;
  grant(): void;
  withdraw(): void;
} {
  const state: Partial<EverConnectOidcConfig> = { enabled: false };
  return {
    get enabled() {
      return !!state.enabled;
    },
    get issuer() {
      return state.issuer;
    },
    get clientId() {
      return state.clientId;
    },
    get clientSecret() {
      return state.clientSecret;
    },
    get redirectUrl() {
      return state.redirectUrl;
    },
    refresh: jest.fn(async () => undefined),
    grant() {
      Object.assign(state, {
        enabled: true,
        issuer: 'https://auth.ever.co',
        clientId: 'rec-connect-client',
        clientSecret: 'connect-client-value',
        redirectUrl:
          'https://rec-api.example.test/api/v1/auth/ever-id/callback',
      });
    },
    withdraw() {
      for (const key of Object.keys(state)) delete (state as any)[key];
      state.enabled = false;
    },
  };
}

describe('EverIdSettingsService', () => {
  it('without a connection, the environment decides once and refresh does nothing', async () => {
    const service = new EverIdSettingsService(configOf(PORTAL));
    expect(service.available).toBe(false);
    expect(service.view.issuer).toBe('');
    await expect(service.refresh()).resolves.toBeUndefined();

    const configured = new EverIdSettingsService(configOf(ENV_CLIENT));
    expect(configured.available).toBe(true);
    expect(configured.view.issuer).toBe('https://idp.example.test');
    expect(configured.view.clientId).toBe('rec-env-client');
  });

  it('turns on when the connection hands over a client, and off when it is withdrawn, without a restart', async () => {
    const connect = connection();
    const service = new EverIdSettingsService(configOf(PORTAL), connect);
    // Injected services keep this object: it must follow the changes.
    const view = service.view;
    expect(service.available).toBe(false);
    expect(view.issuer).toBe('');

    connect.grant();
    expect(service.available).toBe(true);
    expect(view.issuer).toBe('https://auth.ever.co');
    expect(view.issuers).toEqual(['https://auth.ever.co']);
    expect(view.clientId).toBe('rec-connect-client');
    expect(view.redirectUrl).toBe(
      'https://rec-api.example.test/api/v1/auth/ever-id/callback',
    );
    expect(view.portalUrl).toBe('https://app.example.test');

    connect.withdraw();
    expect(service.available).toBe(false);
    expect(view.issuer).toBe('');
    expect(view.clientId).toBe('');
  });

  it('asks the connection to re-read its stored client, and keeps the last one when that fails', async () => {
    const connect = connection();
    connect.grant();
    const service = new EverIdSettingsService(configOf(PORTAL), connect);
    await service.refresh();
    expect(connect.refresh).toHaveBeenCalledTimes(1);

    connect.refresh.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(service.refresh()).resolves.toBeUndefined();
    expect(service.available).toBe(true);
  });

  it('an issuer in the environment wins and never changes: the connection is not even asked', async () => {
    const connect = connection();
    const service = new EverIdSettingsService(configOf(ENV_CLIENT), connect);
    const before = service.current();
    connect.grant();
    await service.refresh();
    expect(connect.refresh).not.toHaveBeenCalled();
    expect(service.current()).toBe(before);
    expect(service.view.issuer).toBe('https://idp.example.test');
    expect(service.view.clientId).toBe('rec-env-client');
    expect(service.available).toBe(true);
  });

  it('an Ever-hosted issuer is accepted only from the connection', () => {
    const service = new EverIdSettingsService(
      configOf({ ...ENV_CLIENT, EVER_ID_ISSUER_URL: 'https://auth.ever.co' }),
      connection(),
    );
    expect(service.available).toBe(false);
    expect(service.view.problems.join(' ')).toContain('Ever-operated install');
  });

  it('resolves again only when the handed-over client changed', () => {
    const connect = connection();
    const service = new EverIdSettingsService(configOf(PORTAL), connect);
    connect.grant();
    const first = service.current();
    expect(service.current()).toBe(first);
    connect.withdraw();
    expect(service.available).toBe(false);
    connect.grant();
    // The same client again: the same values, resolved anew.
    const again = service.current();
    expect(again).not.toBe(first);
    expect(again).toEqual(first);
    expect(service.current()).toBe(again);
  });
});
