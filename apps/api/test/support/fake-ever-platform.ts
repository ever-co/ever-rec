/**
 * An in-process stand-in for the Ever Platform API, for the Ever Platform connection tests. It
 * answers through the `fetch` the module's SDK client is given (no socket is opened), signs its key
 * manifest with a TEST root and its entitlement documents with a TEST entitlement key, and records
 * every request (method, path, headers, body) so tests can assert exactly what left the
 * installation. Nothing here is a real key or a real address.
 */
import { createHash, generateKeyPairSync, KeyObject, randomBytes, sign, verify } from 'node:crypto';
import { keysSha256, signCompactJws } from '@ever-co/connect-sdk';

export const FAKE_PLATFORM_URL = 'http://mock-platform.localhost:8080';
/** The issuer its documents name (a local platform may name another origin than its address). */
export const FAKE_PLATFORM_ISSUER = 'https://mock-platform.test';

export interface RecordedRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: any;
}

interface FakeKey {
  kid: string;
  x: string;
  privateKey: KeyObject;
}

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** The closed members of an entitlement document, from the contracts' own valid fixture. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TEMPLATE = require('@ever-co/connect-contracts/fixtures/entitlement/valid/instance.claims.json').ever;

/** A ULID-shaped id (26 Crockford base32 characters). */
export function fakeUlid(): string {
  const bytes = randomBytes(26);
  let out = '0';
  for (let i = 1; i < 26; i += 1) out += CROCKFORD[bytes[i] % 32];
  return out;
}

function newKey(kid: string): FakeKey {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const x = (publicKey.export({ format: 'jwk' }) as { x: string }).x;
  return { kid, x, privateKey };
}

const signerOf = (key: FakeKey) => (bytes: Uint8Array) => sign(null, bytes, key.privateKey);

const b64json = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

export interface FakeLink {
  id: string;
  orgId: string;
  handle: string;
  productTenantId: string;
  displayName?: string;
  state: string;
  seq: number;
}

export interface FakeInstance {
  id: string;
  x: string;
  kid: string;
  status: 'active' | 'pending_approval' | 'revoked' | 'disconnected';
  orgId: string;
  handle: string;
  seq: number;
  links: Map<string, FakeLink>;
  integrations: Record<string, { enabled: boolean; state: string; consent_id: string | null; config: Record<string, unknown> }>;
  events: Array<{ id: string; type: string; version: number; occurred_at: string; subject: { kind: string; id: string }; data: Record<string, unknown> }>;
  acked: string | null;
  oidc: { requested: boolean; ready: boolean; secretRead: boolean } | null;
  personLinks: Map<string, any>;
  acks: any[];
  publicUrl: string | null;
  statsLink: any | null;
  denied: string[];
}

export class FakeEverPlatform {
  readonly root = newKey('test-root-1');
  readonly entitlementKey = newKey('test-entitlement-1');
  readonly intentKey = newKey('test-intent-1');
  /** Managed-operation results received. */
  readonly managedResults: any[] = [];
  /** `/complete` answers recorded per intent. */
  readonly completions = new Map<string, any>();
  readonly requests: RecordedRequest[] = [];
  readonly instances = new Map<string, FakeInstance>();
  /** Connect codes the platform knows: code → the organization it was minted for. */
  readonly connectCodes = new Map<string, { orgId: string; handle: string; used?: string }>();
  readonly linkCodes = new Map<string, { orgId: string; handle: string; used?: boolean }>();
  /** When set, every request fails as if the platform could not be reached. */
  down = false;
  /** Answer the next redeem with this problem (status, code). */
  failRedeem: { status: number; code: string } | null = null;
  /** Sign the next entitlement documents with an unknown key (they do not verify). */
  tamperEntitlements = false;
  /** Requests (`METHOD /path`) answered once with `503 unavailable`, then served normally. */
  readonly failOnce = new Set<string>();
  /** Integrations whose consent URL answers `integration_not_available`. */
  comingSoon = new Set<string>(['ever_id_login']);
  private readonly idempotency = new Map<string, unknown>();
  private tokens = new Map<string, string>();
  private eventCounter = 0;

  constructor(private readonly now: () => number) {}

  get rootKeys() {
    return [
      {
        kid: this.root.kid,
        iss: FAKE_PLATFORM_ISSUER,
        kty: 'OKP',
        crv: 'Ed25519',
        x: this.root.x,
        use: 'sig',
        alg: 'EdDSA',
      },
    ];
  }

  issueConnectCode(handle = 'acme'): string {
    const code = `EVC-${this.part()}-${this.part()}-${this.part()}`;
    this.connectCodes.set(code, { orgId: fakeUlid(), handle });
    return code;
  }

  issueLinkCode(handle = 'acme', orgId = fakeUlid()): string {
    const code = `EVL-${this.part()}-${this.part()}-${this.part()}`;
    this.linkCodes.set(code, { orgId, handle });
    return code;
  }

  private part(): string {
    const bytes = randomBytes(4);
    return [...bytes].map((b) => CROCKFORD[b % 32]).join('');
  }

  /** The one instance connected so far. */
  get instance(): FakeInstance {
    const first = [...this.instances.values()][0];
    if (!first) throw new Error('no instance');
    return first;
  }

  /** Records an organization's consent (or revocation) and publishes the feed event. */
  setIntegration(key: string, state: string, enabled: boolean): void {
    const instance = this.instance;
    instance.integrations[key] = {
      enabled,
      state,
      consent_id: enabled || state === 'pending_operator' ? fakeUlid() : null,
      config: enabled ? { consent_source: 'app_ever_co' } : {},
    };
    this.publish(enabled ? 'ever.consent.integration.enabled' : 'ever.consent.integration.disabled', {
      integration_key: key,
      enabled,
    });
  }

  publish(type: string, data: Record<string, unknown>): string {
    const instance = this.instance;
    this.eventCounter += 1;
    const id = `01JZZZZZZZZZZZZZZZZZZ${String(this.eventCounter).padStart(5, '0')}`;
    instance.events.push({
      id,
      type,
      version: 1,
      occurred_at: new Date(this.now()).toISOString(),
      subject: { kind: 'instance', id: instance.id },
      data,
    });
    return id;
  }

  private manifest() {
    const nowS = Math.floor(this.now() / 1000);
    const keys = [
      {
        kty: 'OKP',
        crv: 'Ed25519',
        kid: this.entitlementKey.kid,
        x: this.entitlementKey.x,
        use: 'sig',
        alg: 'EdDSA',
        ever_purpose: 'entitlement',
        state: 'active',
        not_before: new Date((nowS - 86400 * 400) * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
        not_after: null,
      },
      {
        kty: 'OKP',
        crv: 'Ed25519',
        kid: this.intentKey.kid,
        x: this.intentKey.x,
        use: 'sig',
        alg: 'EdDSA',
        ever_purpose: 'intent',
        state: 'active',
        not_before: new Date((nowS - 86400 * 400) * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
        not_after: null,
      },
    ];
    return signCompactJws(
      signerOf(this.root),
      { alg: 'EdDSA', kid: this.root.kid, typ: 'ever-key-manifest+jwt' },
      {
        iss: FAKE_PLATFORM_ISSUER,
        iat: nowS - 60,
        exp: nowS + 86400 * 30,
        keys_sha256: keysSha256(keys),
        root_kid: this.root.kid,
      },
    ).then((manifest) => ({ manifest, keys }));
  }

  entitlement(instance: FakeInstance, link?: FakeLink): Promise<string> {
    const nowS = Math.floor(this.now() / 1000);
    const key = this.tamperEntitlements ? newKey('test-entitlement-1') : this.entitlementKey;
    const ever: Record<string, unknown> = {
      schema: 'ever.entitlement.v1',
      seq: link ? link.seq : instance.seq,
      org_id: link ? link.orgId : instance.orgId,
      handle: link ? link.handle : instance.handle,
      tenant_id: fakeUlid(),
      instance_id: instance.id,
      tier: 'free',
      plan: { code: 'community', source: 'community' },
      products: ['rec'],
      licence_ids: [],
      features: { ...TEMPLATE.features },
      limits: { ...TEMPLATE.limits },
      meters: { ...TEMPLATE.meters },
      managed: { updates: false, backups: false, support_level: 'community' },
      grace_s: 2592000,
      refresh_after_s: 21600,
    };
    if (link) {
      ever.tenant_link_id = link.id;
      ever.tenant = { product: 'rec', product_tenant_id: link.productTenantId };
    }
    return signCompactJws(
      signerOf(key),
      { alg: 'EdDSA', kid: key.kid, typ: 'ever-entitlement+jwt' },
      {
        iss: FAKE_PLATFORM_ISSUER,
        aud: 'ever-connect',
        sub: link ? `link:${link.id}` : `instance:${instance.id}`,
        jti: fakeUlid(),
        iat: nowS,
        nbf: nowS - 60,
        exp: nowS + 604800,
        ever,
      },
    );
  }

  private json(status: number, body?: unknown, headers: Record<string, string> = {}): Response {
    if (body === undefined) return new Response(null, { status, headers });
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    });
  }

  private problem(status: number, code: string, extra: Record<string, unknown> = {}): Response {
    return new Response(JSON.stringify({ type: `https://errors.ever.co/${code}`, title: code, status, code, ...extra }), {
      status,
      headers: { 'content-type': 'application/problem+json' },
    });
  }

  /** The instance a bearer token belongs to, or a 401 answer. */
  private authed(headers: Record<string, string>): FakeInstance | Response {
    const token = (headers['authorization'] ?? '').replace(/^Bearer /, '');
    const id = this.tokens.get(token);
    const instance = id ? this.instances.get(id) : undefined;
    if (!instance) return this.problem(401, 'invalid_token');
    if (instance.status === 'revoked') return this.problem(401, 'credential_revoked');
    if (instance.status === 'disconnected') return this.problem(401, 'credential_revoked');
    return instance;
  }

  /** The `fetch` the module is given. */
  readonly fetch = async (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const headers: Record<string, string> = {};
    for (const [name, value] of Object.entries((init.headers ?? {}) as Record<string, string>)) {
      headers[name.toLowerCase()] = String(value);
    }
    const text = typeof init.body === 'string' ? init.body : init.body ? Buffer.from(init.body as ArrayBuffer).toString('utf8') : '';
    let body: any = undefined;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = text;
    }
    const request: RecordedRequest = {
      method: (init.method ?? 'GET').toUpperCase(),
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      headers,
      body,
    };
    this.requests.push(request);
    if (this.down) throw new TypeError('fetch failed');
    if (url.origin !== FAKE_PLATFORM_URL) throw new TypeError('unexpected host');
    return this.route(request);
  };

  private async route(r: RecordedRequest): Promise<Response> {
    const { method, path } = r;
    if (this.failOnce.delete(`${method} ${path}`)) {
      return this.problem(503, 'unavailable');
    }
    if (method === 'GET' && path === '/.well-known/ever-keys.json') {
      return this.json(200, await this.manifest());
    }
    if (method === 'POST' && path === '/v1/connect/redeem') return this.redeem(r);
    if (method === 'POST' && path === '/v1/instances/token') return this.token(r);
    const instance = this.authed(r.headers);
    if (instance instanceof Response) return instance;
    if (instance.status === 'pending_approval' && path !== '/v1/instances/me') {
      return this.problem(403, 'pending_approval');
    }
    const linkMatch = /^\/v1\/instances\/me\/tenant-links\/([^/]+)(\/entitlement)?$/.exec(path);
    if (method === 'GET' && path === '/v1/instances/me') {
      return this.json(200, { instance: { id: instance.id, status: instance.status }, tenant_links: [] });
    }
    if (method === 'GET' && path === '/v1/instances/me/entitlement') {
      if (r.headers['if-none-match'] === `"${instance.seq}"`) return this.json(304);
      return this.json(200, {
        document: await this.entitlement(instance),
        seq: instance.seq,
        expires_at: new Date(this.now() + 604800000).toISOString(),
      });
    }
    if (method === 'POST' && path === '/v1/instances/me/tenant-links') {
      const code = this.linkCodes.get(String(r.body?.link_code).toUpperCase());
      if (!code || code.used) return this.problem(422, 'invalid_link_code');
      code.used = true;
      const link: FakeLink = {
        id: fakeUlid(),
        orgId: code.orgId,
        handle: code.handle,
        productTenantId: r.body.product_tenant_id,
        displayName: r.body.display_name,
        state: 'active',
        seq: 1,
      };
      instance.links.set(link.id, link);
      return this.json(201, this.linkView(instance, link));
    }
    if (linkMatch && method === 'GET' && linkMatch[2]) {
      const link = instance.links.get(linkMatch[1]);
      if (!link || link.state === 'unlinked') return this.problem(404, 'not_found');
      if (r.headers['if-none-match'] === `"${link.seq}"`) return this.json(304);
      return this.json(200, {
        document: await this.entitlement(instance, link),
        seq: link.seq,
        expires_at: new Date(this.now() + 604800000).toISOString(),
      });
    }
    if (linkMatch && method === 'DELETE' && !linkMatch[2]) {
      const link = instance.links.get(linkMatch[1]);
      if (!link) return this.problem(404, 'not_found');
      link.state = 'unlinked';
      return this.json(204);
    }
    if (method === 'POST' && path === '/v1/instances/me/heartbeat') {
      instance.denied = r.body?.integrations_denied ?? instance.denied;
      return this.json(200, { recorded: true, notices: [], server_time: new Date(this.now()).toISOString() });
    }
    if (method === 'GET' && path === '/v1/instances/me/integrations') {
      const view: Record<string, unknown> = {};
      for (const key of ['instance_url', 'stats_link', 'ever_id_login', 'managed_operations']) {
        const state = instance.integrations[key];
        view[key] = instance.denied.includes(key)
          ? { enabled: false, state: 'denied_by_policy', consent_id: null, config: {} }
          : (state ?? { enabled: false, state: 'available', consent_id: null, config: {} });
      }
      return this.json(200, { catalog_version: 'test', instance: view, links: {} });
    }
    const integrationMatch = /^\/v1\/instances\/me\/integrations\/([a-z_]+)(\/accept)?$/.exec(path);
    if (integrationMatch && method === 'PUT') {
      const key = integrationMatch[1];
      const state = instance.integrations[key];
      if (!state) return this.problem(404, 'not_found');
      instance.integrations[key] = {
        enabled: false,
        state: r.body?.reason === 'policy' ? 'denied_by_policy' : 'disabled',
        consent_id: state.consent_id,
        config: {},
      };
      return this.json(200, { ...instance.integrations[key], scope_version: 1 });
    }
    if (integrationMatch && method === 'POST' && integrationMatch[2]) {
      const key = integrationMatch[1];
      const state = instance.integrations[key];
      if (!state || state.state !== 'pending_operator') return this.problem(409, 'not_pending');
      instance.integrations[key] = {
        enabled: r.body?.accepted === true,
        state: r.body?.accepted === true ? 'enabled' : 'declined',
        consent_id: state.consent_id,
        config: {},
      };
      return this.json(200, { ...instance.integrations[key], scope_version: 1 });
    }
    if (method === 'GET' && path === '/v1/instances/me/consent-url') {
      if (this.comingSoon.has(r.query.integration)) return this.problem(422, 'integration_not_available');
      return this.json(200, {
        url: `https://app.ever.co/connect/consent?i=${instance.id}&integration=${r.query.integration}&sig=test`,
        expires_at: new Date(this.now() + 600000).toISOString(),
      });
    }
    if (method === 'GET' && path === '/v1/instances/me/events') {
      const after = r.query.after;
      const start = after ? instance.events.findIndex((e) => e.id === after) + 1 : 0;
      const page = instance.events.slice(start, start + 50);
      return this.json(200, {
        events: page,
        has_more: start + 50 < instance.events.length,
        last_id: page.length ? page[page.length - 1].id : (after ?? ''),
      });
    }
    if (method === 'POST' && path === '/v1/instances/me/events/ack') {
      instance.acked = r.body?.last_id ?? null;
      return this.json(200, { acknowledged: instance.acked });
    }
    if (method === 'POST' && path === '/v1/instances/me/oidc-client') {
      if (instance.oidc?.requested) return this.problem(409, 'already_requested');
      instance.oidc = { requested: true, ready: true, secretRead: false };
      return this.json(202, { job_id: fakeUlid(), client_id: null, client_secret: null, issuer: null });
    }
    if (method === 'GET' && path === '/v1/instances/me/oidc-client') {
      if (!instance.oidc?.ready) return this.json(200, { job_id: fakeUlid() });
      const secret = instance.oidc.secretRead ? null : 'test-client-secret-value';
      instance.oidc.secretRead = true;
      return this.json(200, { issuer: 'https://auth.ever.co', client_id: `rec-${instance.id}`, client_secret: secret });
    }
    if (method === 'POST' && path === '/v1/instances/me/person-links') {
      instance.personLinks.set(r.body.product_user_ref, r.body);
      return this.json(201, {
        id: fakeUlid(),
        instance_id: instance.id,
        link_method: r.body.link_method,
        linked_at: new Date(this.now()).toISOString(),
        person_id: fakeUlid(),
        product_user_ref: r.body.product_user_ref,
      });
    }
    const personMatch = /^\/v1\/instances\/me\/person-links\/([^/]+)$/.exec(path);
    if (personMatch && method === 'DELETE') {
      instance.personLinks.delete(decodeURIComponent(personMatch[1]));
      return this.json(204);
    }
    if (method === 'POST' && path === '/v1/instances/me/ack') {
      instance.acks.push(r.body);
      return this.json(204);
    }
    if (method === 'PUT' && path === '/v1/instances/me/public-url') {
      if (!instance.integrations.instance_url?.enabled) return this.problem(403, 'integration_disabled');
      instance.publicUrl = r.body?.base_url ?? null;
      return this.json(200, { base_url: instance.publicUrl });
    }
    if (method === 'POST' && path === '/v1/instances/me/stats-link') {
      if (!instance.integrations.stats_link?.enabled) return this.problem(403, 'integration_disabled');
      instance.statsLink = r.body;
      return this.json(200, {});
    }
    const completeMatch = /^\/v1\/provision-intents\/([^/]+)\/complete$/.exec(path);
    if (completeMatch && method === 'POST') {
      const jti = completeMatch[1];
      if (r.body?.instance_id !== instance.id) return this.problem(403, 'forbidden_role');
      if (this.completions.has(jti)) {
        return this.json(200, { status: 'already_completed', tenant_link_id: this.completions.get(jti).tenant_link_id });
      }
      let tenantLinkId: string | null = null;
      if (r.body?.result === 'created') {
        const link: FakeLink = {
          id: fakeUlid(),
          orgId: instance.orgId,
          handle: 'acme',
          productTenantId: r.body.product_tenant_id,
          state: 'active',
          seq: 1,
        };
        instance.links.set(link.id, link);
        tenantLinkId = link.id;
      }
      this.completions.set(jti, { ...r.body, tenant_link_id: tenantLinkId });
      return this.json(200, { status: 'completed', tenant_link_id: tenantLinkId, job_id: null });
    }
    const managedMatch = /^\/v1\/instances\/me\/managed-operations\/([^/]+)\/result$/.exec(path);
    if (managedMatch && method === 'POST') {
      this.managedResults.push({ id: managedMatch[1], ...r.body });
      return this.json(200, {});
    }
    if (method === 'POST' && path === '/v1/instances/me/disconnect') {
      instance.status = 'disconnected';
      return this.json(200, { instance: { id: instance.id, status: 'disconnected' }, tenant_links: [] });
    }
    if (method === 'POST' && path === '/v1/instances/me/keys') {
      const proof = String(r.body?.new_key_proof ?? '').split('.');
      const header = proof[0] ? b64json(proof[0]) : {};
      instance.x = r.body?.public_jwk?.x;
      const previous = instance.kid;
      instance.kid = header.kid ?? instance.kid;
      return this.json(200, {
        kid: instance.kid,
        previous_kid: previous,
        previous_valid_until: new Date(this.now() + 604800000).toISOString(),
      });
    }
    return this.problem(404, 'not_found');
  }

  private linkView(instance: FakeInstance, link: FakeLink) {
    return {
      id: link.id,
      instance_id: instance.id,
      link_method: 'link_code',
      linked_at: new Date(this.now()).toISOString(),
      org_id: link.orgId,
      product: 'rec',
      product_tenant_id: link.productTenantId,
      display_name: link.displayName ?? null,
      state: link.state,
    };
  }

  private redeem(r: RecordedRequest): Response {
    const key = r.headers['idempotency-key'];
    if (key && this.idempotency.has(key)) return this.json(201, this.idempotency.get(key));
    if (this.failRedeem) {
      const { status, code } = this.failRedeem;
      this.failRedeem = null;
      return this.problem(status, code);
    }
    const code = this.connectCodes.get(String(r.body?.code).toUpperCase());
    if (!code || code.used) return this.problem(422, 'invalid_code');
    const instance: FakeInstance = {
      id: fakeUlid(),
      x: r.body.public_jwk.x,
      kid: createHash('sha256').update(Buffer.from(r.body.public_jwk.x, 'base64url')).digest().subarray(0, 8).toString('base64url'),
      status: 'active',
      orgId: code.orgId,
      handle: code.handle,
      seq: 1,
      links: new Map(),
      integrations: {},
      events: [],
      acked: null,
      oidc: null,
      personLinks: new Map(),
      acks: [],
      publicUrl: null,
      statsLink: null,
      denied: [],
    };
    code.used = instance.id;
    this.instances.set(instance.id, instance);
    let link: FakeLink | null = null;
    if (r.body.tenant?.product_tenant_id) {
      link = {
        id: fakeUlid(),
        orgId: code.orgId,
        handle: code.handle,
        productTenantId: r.body.tenant.product_tenant_id,
        displayName: r.body.tenant.display_name,
        state: 'active',
        seq: 1,
      };
      instance.links.set(link.id, link);
    }
    const answer = {
      instance_id: instance.id,
      kid: instance.kid,
      status: 'active',
      token_endpoint: `${FAKE_PLATFORM_URL}/v1/instances/token`,
      entitlement_endpoint: `${FAKE_PLATFORM_URL}/v1/instances/me/entitlement`,
      feed_endpoint: `${FAKE_PLATFORM_URL}/v1/instances/me/events`,
      link: link ? this.linkView(instance, link) : null,
    };
    if (key) this.idempotency.set(key, answer);
    return this.json(201, answer);
  }

  private token(r: RecordedRequest): Response {
    const assertion = String(r.body?.client_assertion ?? '');
    const [h, p, s] = assertion.split('.');
    if (!h || !p || !s) return this.problem(400, 'invalid_request');
    const claims = b64json(p);
    const instance = this.instances.get(claims.iss);
    if (!instance || claims.sub !== claims.iss) return this.problem(401, 'invalid_client');
    if (instance.status === 'revoked' || instance.status === 'disconnected') {
      return this.problem(401, 'credential_revoked');
    }
    const ok = verify(
      null,
      Buffer.from(`${h}.${p}`),
      { key: { kty: 'OKP', crv: 'Ed25519', x: instance.x }, format: 'jwk' },
      Buffer.from(s, 'base64url'),
    );
    if (!ok) return this.problem(401, 'invalid_client');
    const token = `evit_${randomBytes(16).toString('base64url')}`;
    this.tokens.set(token, instance.id);
    return this.json(200, { access_token: token, token_type: 'Bearer', expires_in: 3600 });
  }

  /** A provision intent for Ever Rec, signed with the TEST intent key (claims can be overridden). */
  async signIntent(overrides: Record<string, unknown> = {}, key: 'intent' | 'entitlement' = 'intent') {
    const nowS = Math.floor(this.now() / 1000);
    const jti = fakeUlid();
    const signer = key === 'intent' ? this.intentKey : this.entitlementKey;
    const claims = {
      iss: FAKE_PLATFORM_ISSUER,
      aud: 'ever-connect:rec',
      jti,
      iat: nowS,
      exp: nowS + 900,
      typ: 'ever.provision_intent.v1',
      ever_purpose: 'intent',
      job_id: fakeUlid(),
      step_seq: 1,
      idempotency_key: `rec:${jti}`,
      org: { id: fakeUlid(), handle: 'acme', display_name: 'Acme Inc' },
      product: 'rec',
      tier: 'free',
      features: {},
      person: { ever_id_sub: 'sub-person-1' },
      consent_id: fakeUlid(),
      mode: 'handoff',
      callback: `${FAKE_PLATFORM_ISSUER}/v1/provision-intents/${jti}/complete`,
      return_to: 'https://app.ever.co/start/jobs/1',
      ...overrides,
    };
    const jws = await signCompactJws(
      signerOf(signer),
      { alg: 'EdDSA', kid: signer.kid, typ: 'ever-intent+jwt' },
      claims,
    );
    return { jws, claims };
  }

  /** Every recorded request as `METHOD /path`. */
  calls(): string[] {
    return this.requests.map((r) => `${r.method} ${r.path}`);
  }
}
