import { resetWarnings } from '../../common/ever-platform/env';
import {
  describeConfig,
  normaliseConnectCode,
  readEverConnectConfig,
} from './ever-connect.config';

describe('ever-connect config', () => {
  let warnings: string[];
  const warn = (message: string) => warnings.push(message);
  const read = (env: Record<string, string | undefined>) =>
    readEverConnectConfig(env, warn);

  beforeEach(() => {
    warnings = [];
    resetWarnings();
  });

  it('defaults: api.ever.co, long poll, self-hosted, no code, nothing denied', () => {
    const config = read({});
    expect(config.apiUrl).toBe('https://api.ever.co');
    expect(config.feedMode).toBe('longpoll');
    expect(config.installSource).toBe('self-hosted');
    expect(config.envCode).toBeNull();
    expect([...config.denied]).toEqual([]);
    expect(config.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(warnings).toEqual([]);
  });

  it('reads the connect code case-insensitively and never logs it', () => {
    const config = read({ EVER_CONNECT_CODE: ' evc-abcd-efgh-jkmn ' });
    expect(config.envCode).toBe('EVC-ABCD-EFGH-JKMN');
    expect(describeConfig(config)).not.toContain('ABCD');
    expect(describeConfig(config)).toContain('env_code=set');
  });

  it('ignores a value that is not a connect code, with one warning that does not repeat it', () => {
    const config = read({ EVER_CONNECT_CODE: 'EVL-ABCD-EFGH-JKMN' });
    expect(config.envCode).toBeNull();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).not.toContain('ABCD');
  });

  it('the deny list keeps Rec keys only; * denies all three', () => {
    expect([
      ...read({ EVER_CONNECT_INTEGRATIONS_DENY: 'stats_link, webhooks' })
        .denied,
    ]).toEqual(['stats_link']);
    expect(warnings).toHaveLength(1);
    expect([...read({ EVER_CONNECT_INTEGRATIONS_DENY: '*' }).denied]).toEqual([
      'instance_url',
      'stats_link',
      'ever_id_login',
    ]);
  });

  it('interval feed mode; anything else is long poll with a warning', () => {
    expect(read({ EVER_CONNECT_FEED_MODE: 'interval' }).feedMode).toBe(
      'interval',
    );
    expect(read({ EVER_CONNECT_FEED_MODE: 'websocket' }).feedMode).toBe(
      'longpoll',
    );
    expect(warnings).toHaveLength(1);
  });

  it('plain http only for a local platform; a public one is unusable (nothing is sent)', () => {
    expect(
      read({ EVER_PLATFORM_API_URL: 'http://localhost:4000' }).apiUrl,
    ).toBe('http://localhost:4000');
    expect(
      read({ EVER_PLATFORM_API_URL: 'http://api.example.com' }).apiUrl,
    ).toBeNull();
  });

  it('a public https platform is used as given; an empty value keeps the default', () => {
    expect(
      read({ EVER_PLATFORM_API_URL: 'https://api-stage.ever.co/' }).apiUrl,
    ).toBe('https://api-stage.ever.co');
    expect(read({ EVER_PLATFORM_API_URL: '' }).apiUrl).toBe(
      'https://api.ever.co',
    );
    expect(
      read({ EVER_PLATFORM_API_URL: 'https://user:pw@api.ever.co' }).apiUrl,
    ).toBeNull();
  });

  it('the provision routes are off unless EVER_CONNECT_PROVISION_ENABLED is exactly true', () => {
    expect(read({}).provisionEnabled).toBe(false);
    expect(
      read({ EVER_CONNECT_PROVISION_ENABLED: 'TRUE' }).provisionEnabled,
    ).toBe(false);
    expect(
      read({ EVER_CONNECT_PROVISION_ENABLED: 'true' }).provisionEnabled,
    ).toBe(true);
  });

  it('connect codes: the SDK pattern, normalised', () => {
    expect(normaliseConnectCode('EVC-0000-1111-2222')).toBe(
      'EVC-0000-1111-2222',
    );
    expect(normaliseConnectCode('EVC-0000-1111')).toBeNull();
    expect(normaliseConnectCode(42)).toBeNull();
  });
});
