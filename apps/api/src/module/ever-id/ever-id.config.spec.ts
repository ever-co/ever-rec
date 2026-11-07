import {
  isEverHost,
  isEverIdAvailable,
  readEverIdSettings,
} from './ever-id.config';

const CLIENT = {
  EVER_ID_CLIENT_ID: 'rec-client',
  EVER_ID_CLIENT_SECRET: 'rec-secret',
  EVER_ID_REDIRECT_URL: 'https://api.example.test/api/v1/auth/ever-id/callback',
  WEBSITE_URL: 'https://app.example.test',
};

describe('Ever ID settings', () => {
  it('keeps the provider off when no issuer is configured', () => {
    const settings = readEverIdSettings({ ...CLIENT });
    expect(settings.issuer).toBe('');
    expect(isEverIdAvailable(settings)).toBe(false);
    expect(settings.warnings).toEqual([]);
    expect(settings.problems).toEqual([]);
  });

  it('ignores every other variable while the issuer is unset, including an unknown link mode', () => {
    expect(() =>
      readEverIdSettings({
        EVER_ID_LINK_MODE: 'confirmed',
        EVER_ID_ALLOWED_ISSUERS: 'not a url',
      }),
    ).not.toThrow();
  });

  it('turns on with a non-Ever issuer and a complete client', () => {
    const settings = readEverIdSettings({
      EVER_ID_ISSUER_URL: 'https://idp.example.test/',
      ...CLIENT,
    });
    expect(isEverIdAvailable(settings)).toBe(true);
    expect(settings.issuer).toBe('https://idp.example.test');
    expect(settings.issuers).toEqual(['https://idp.example.test']);
    expect(settings.signUpAllowed).toBe(true);
    expect(settings.backchannelLogoutEnabled).toBe(true);
    expect(settings.logoutRevokeFirebase).toBe(false);
    expect(settings.linkMode).toBe('explicit');
  });

  it('reads the deprecated EVER_ID_ISSUER alias with exactly one warning', () => {
    const settings = readEverIdSettings({
      EVER_ID_ISSUER: 'https://idp.example.test',
      ...CLIENT,
    });
    expect(isEverIdAvailable(settings)).toBe(true);
    expect(settings.issuer).toBe('https://idp.example.test');
    expect(settings.warnings).toEqual([
      'EVER_ID_ISSUER is deprecated; set EVER_ID_ISSUER_URL instead.',
    ]);
  });

  it('reads the deprecated EVER_ID_JIT_SIGNUP alias with one warning', () => {
    const settings = readEverIdSettings({
      EVER_ID_ISSUER_URL: 'https://idp.example.test',
      EVER_ID_JIT_SIGNUP: 'false',
      ...CLIENT,
    });
    expect(settings.signUpAllowed).toBe(false);
    expect(settings.warnings).toEqual([
      'EVER_ID_JIT_SIGNUP is deprecated; set EVER_ID_SIGN_UP_ALLOWED instead.',
    ]);
  });

  it('refuses an Ever-hosted issuer on an install that is not Ever-operated, with one problem line', () => {
    const settings = readEverIdSettings({
      EVER_ID_ISSUER_URL: 'https://auth.ever.co',
      ...CLIENT,
    });
    expect(isEverIdAvailable(settings)).toBe(false);
    expect(settings.problems).toHaveLength(1);
    expect(settings.problems[0]).toContain('EVER_INSTALL_SOURCE=cloud');
  });

  it('accepts an Ever-hosted issuer on an Ever-operated install', () => {
    const settings = readEverIdSettings({
      EVER_ID_ISSUER_URL: 'https://auth.ever.co',
      EVER_INSTALL_SOURCE: 'cloud',
      ...CLIENT,
    });
    expect(isEverIdAvailable(settings)).toBe(true);
  });

  it('accepts an Ever-hosted issuer handed over by a connected-instance module when the environment sets none', () => {
    const settings = readEverIdSettings(
      { ...CLIENT, EVER_ID_CLIENT_ID: '', EVER_ID_CLIENT_SECRET: '' },
      {
        enabled: true,
        issuer: 'https://auth.ever.co',
        clientId: 'inst-client',
        clientSecret: 'inst-secret',
      },
    );
    expect(isEverIdAvailable(settings)).toBe(true);
    expect(settings.clientId).toBe('inst-client');
  });

  it('drops an Ever-hosted extra issuer on a self-hosted install and keeps the rest', () => {
    const settings = readEverIdSettings({
      EVER_ID_ISSUER_URL: 'https://idp.example.test',
      EVER_ID_ALLOWED_ISSUERS:
        'https://auth.ever.co, https://idp2.example.test',
      ...CLIENT,
    });
    expect(isEverIdAvailable(settings)).toBe(true);
    expect(settings.issuers).toEqual([
      'https://idp.example.test',
      'https://idp2.example.test',
    ]);
    expect(settings.warnings).toHaveLength(1);
  });

  it('refuses a link mode other than explicit at boot', () => {
    expect(() =>
      readEverIdSettings({
        EVER_ID_ISSUER_URL: 'https://idp.example.test',
        EVER_ID_LINK_MODE: 'confirmed',
        ...CLIENT,
      }),
    ).toThrow(/EVER_ID_LINK_MODE/);
    expect(() =>
      readEverIdSettings({
        EVER_ID_ISSUER_URL: 'https://idp.example.test',
        EVER_ID_LINK_MODE: 'explicit',
        ...CLIENT,
      }),
    ).not.toThrow();
  });

  it('accepts at most three issuers', () => {
    const settings = readEverIdSettings({
      EVER_ID_ISSUER_URL: 'https://a.example.test',
      EVER_ID_ALLOWED_ISSUERS:
        'https://b.example.test,https://c.example.test,https://d.example.test',
      ...CLIENT,
    });
    expect(isEverIdAvailable(settings)).toBe(false);
  });

  it('stays off without a complete client and names what is missing', () => {
    const settings = readEverIdSettings({
      EVER_ID_ISSUER_URL: 'https://idp.example.test',
    });
    expect(isEverIdAvailable(settings)).toBe(false);
    expect(settings.problems[0]).toContain('EVER_ID_CLIENT_ID');
    expect(settings.problems[0]).toContain('EVER_ID_CLIENT_SECRET');
  });

  it('requires https, except on a loopback host', () => {
    expect(
      isEverIdAvailable(
        readEverIdSettings({
          EVER_ID_ISSUER_URL: 'http://idp.example.test',
          ...CLIENT,
        }),
      ),
    ).toBe(false);
    expect(
      isEverIdAvailable(
        readEverIdSettings({
          EVER_ID_ISSUER_URL: 'http://127.0.0.1:8080',
          ...CLIENT,
        }),
      ),
    ).toBe(true);
    expect(
      isEverIdAvailable(
        readEverIdSettings({
          EVER_ID_ISSUER_URL: 'https://idp.example.test?x=1',
          ...CLIENT,
        }),
      ),
    ).toBe(false);
  });

  it('adds the platform audience scope only when the project id is set', () => {
    const settings = readEverIdSettings({
      EVER_ID_ISSUER_URL: 'https://idp.example.test',
      EVER_ID_PLATFORM_PROJECT_ID: '123456',
      ...CLIENT,
    });
    expect(settings.platformProjectId).toBe('123456');
  });

  it('recognises Ever hosts', () => {
    expect(isEverHost('https://auth.ever.co')).toBe(true);
    expect(isEverHost('https://ever.co')).toBe(true);
    expect(isEverHost('https://auth-stage.ever.co/')).toBe(true);
    expect(isEverHost('https://notever.co')).toBe(false);
    expect(isEverHost('https://ever.co.example.test')).toBe(false);
  });
});
