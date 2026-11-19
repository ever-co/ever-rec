import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createPublicKey, verify as edVerify } from 'node:crypto';
import {
  EVER_INSTANCE_SETTINGS,
  EverInstanceSettings,
} from '../../ever-instance/ever-instance.settings';
import { EVER_ID_LINK_ROOTS } from '../../ever-id/services/ever-id-link.service';
import { EVER_CONNECT_CONFIG, EverConnectConfig } from '../ever-connect.config';
import { open, seal, SealError } from '../ever-connect.crypto';
import {
  EVER_CONNECT_CLOCK,
  EVER_CONNECT_WORKSPACE_CREATOR,
  EverConnectClock,
  EverConnectWorkspaceCreator,
} from '../ever-connect.tokens';
import {
  EVER_CONNECT_PATHS,
  LinkRecord,
  ProvisionResultRecord,
} from '../ever-connect.types';
import { EverConnectAuditService } from './ever-connect-audit.service';
import {
  EverConnectClientService,
  errorCode,
  platformAnswered,
} from './ever-connect-client.service';
import {
  EverConnectEntitlementService,
  linkFacts,
  storedFrom,
} from './ever-connect-entitlement.service';
import { checkPublicUrl } from './ever-connect-integrations.service';
import { EverConnectStoreService, isDbKey } from './ever-connect-store.service';

/** The header `typ` of a provision intent. */
export const INTENT_HEADER_TYP = 'ever-intent+jwt';
/** The claim `typ` of a provision intent. */
export const INTENT_CLAIMS_TYP = 'ever.provision_intent.v1';
/** The audience of an intent for Ever Rec. */
export const INTENT_AUDIENCE = 'ever-connect:rec';
/** The longest an intent lives (seconds). */
export const INTENT_MAX_TTL_S = 900;
/** Clock skew tolerated on `iat` (seconds). */
export const INTENT_SKEW_S = 300;

/** The claims of `ever.provision_intent.v1` this installation reads. */
export interface IntentClaims {
  iss: string;
  aud: string;
  jti: string;
  iat: number;
  exp: number;
  typ: string;
  ever_purpose: string;
  product: string;
  mode: string;
  org: { id: string; handle: string; display_name: string };
  person: { ever_id_sub: string };
  instance_id?: string;
  return_to: string;
}

/** What the sealed `provisionTxn` carries (never an e-mail address). */
interface ProvisionTxn {
  jti: string;
  sub: string;
  org: { id: string; handle: string; displayName: string };
  returnTo: string | null;
  exp: number;
}

const JTI = /^[A-Za-z0-9_-]{1,64}$/;
const B64URL = /^[A-Za-z0-9_-]+$/;

const refuse = (
  Exception: new (body: unknown) => HttpException,
  status: number,
  code: string,
  message: string,
) => new Exception({ statusCode: status, code, message });

function decodePart(part: string): any {
  if (!B64URL.test(part)) throw new Error('malformed');
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

/**
 * Ever Rec cloud provisioning, hand-off only: app.ever.co sends the person to the portal with a
 * signed intent; this installation checks it and creates nothing until the person, signed in with
 * the same Ever ID, confirms on a Rec screen. Then one workspace is created with that person as
 * its admin, linked to the organization, and Ever Platform is told. Declining tells it too.
 *
 * Off unless `EVER_CONNECT_PROVISION_ENABLED=true` (the routes answer 404).
 */
@Injectable()
export class EverConnectProvisionService {
  private readonly logger = new Logger('EverConnect');

  constructor(
    @Inject(EVER_CONNECT_CONFIG) private readonly config: EverConnectConfig,
    @Inject(EVER_CONNECT_CLOCK) private readonly clock: EverConnectClock,
    @Inject(EVER_INSTANCE_SETTINGS)
    private readonly settings: EverInstanceSettings,
    @Inject(EVER_CONNECT_WORKSPACE_CREATOR)
    private readonly workspaces: EverConnectWorkspaceCreator,
    private readonly store: EverConnectStoreService,
    private readonly client: EverConnectClientService,
    private readonly entitlements: EverConnectEntitlementService,
    private readonly audit: EverConnectAuditService,
  ) {}

  private nowS(): number {
    return Math.floor(this.clock() / 1000);
  }

  private async connected() {
    const connection = await this.store.connection();
    if (connection?.status !== 'active') {
      throw refuse(
        ConflictException,
        409,
        'not_connected',
        'This installation is not connected to Ever Platform.',
      );
    }
    return connection;
  }

  /**
   * Verifies an intent: EdDSA with a key of purpose `intent` from the root-verified key set,
   * `typ`, issuer, audience, product, times, the addressed installation, and that its `jti` was
   * not answered yet.
   */
  async verifyIntent(jws: unknown): Promise<IntentClaims> {
    const connection = await this.connected();
    const parts = typeof jws === 'string' ? jws.trim().split('.') : [];
    if (parts.length !== 3 || (jws as string).length > 16_384) {
      throw refuse(BadRequestException, 400, 'invalid_intent', 'Not an intent.');
    }
    let header: { alg?: string; typ?: string; kid?: string; crit?: unknown };
    let claims: IntentClaims;
    try {
      header = decodePart(parts[0]);
      claims = decodePart(parts[1]);
      if (!B64URL.test(parts[2])) throw new Error('malformed');
    } catch {
      throw refuse(BadRequestException, 400, 'invalid_intent', 'Not an intent.');
    }
    const invalid = () =>
      refuse(UnauthorizedException, 401, 'invalid_intent', 'The intent does not verify.');
    if (
      header.alg !== 'EdDSA' ||
      header.typ !== INTENT_HEADER_TYP ||
      header.crit !== undefined ||
      typeof header.kid !== 'string'
    ) {
      throw invalid();
    }
    const nowS = this.nowS();
    const ok = await this.client.run(async (client) => {
      let keySet = await this.client.keySet(client);
      let key = keySet.find(header.kid as string, 'intent', nowS);
      if (!key && !keySet.has(header.kid as string) && keySet.unknownKidRefreshAllowed(nowS)) {
        keySet = await this.client.keySet(client, true);
        key = keySet.find(header.kid as string, 'intent', nowS);
      }
      if (!key) return false;
      const publicKey = createPublicKey({
        key: { kty: 'OKP', crv: 'Ed25519', x: key.x },
        format: 'jwk',
      });
      if (
        !edVerify(
          null,
          Buffer.from(`${parts[0]}.${parts[1]}`, 'utf8'),
          publicKey,
          Buffer.from(parts[2], 'base64url'),
        )
      ) {
        return false;
      }
      return claims.iss === client.issuer;
    });
    if (!ok) throw invalid();
    if (claims.aud !== INTENT_AUDIENCE) {
      throw refuse(UnauthorizedException, 401, 'wrong_audience', 'This intent is not for Ever Rec.');
    }
    if (
      claims.typ !== INTENT_CLAIMS_TYP ||
      claims.ever_purpose !== 'intent' ||
      claims.mode !== 'handoff' ||
      typeof claims.jti !== 'string' ||
      !JTI.test(claims.jti) ||
      typeof claims.person?.ever_id_sub !== 'string' ||
      !claims.person.ever_id_sub ||
      typeof claims.org?.id !== 'string' ||
      typeof claims.org?.handle !== 'string' ||
      typeof claims.org?.display_name !== 'string' ||
      !Number.isInteger(claims.iat) ||
      !Number.isInteger(claims.exp)
    ) {
      throw invalid();
    }
    if (claims.product !== 'rec') {
      throw refuse(UnprocessableEntityException, 422, 'product_mismatch', 'This intent is for another product.');
    }
    if (claims.instance_id && claims.instance_id !== connection.registryInstanceId) {
      throw refuse(UnprocessableEntityException, 422, 'instance_mismatch', 'This intent is for another installation.');
    }
    if (claims.iat > nowS + INTENT_SKEW_S || claims.exp - claims.iat > INTENT_MAX_TTL_S) {
      throw invalid();
    }
    if (claims.exp <= nowS) {
      throw refuse(ConflictException, 409, 'intent_expired', 'This link has expired: start again from app.ever.co.');
    }
    if (await this.result(claims.jti)) {
      throw refuse(ConflictException, 409, 'intent_consumed', 'This link was already used.');
    }
    return claims;
  }

  private result(jti: string): Promise<ProvisionResultRecord | null> {
    if (!isDbKey(jti)) return Promise.resolve(null);
    return this.store
      .db()
      .ref(`${EVER_CONNECT_PATHS.provisionResults}/${jti}`)
      .get()
      .then((snapshot) => (snapshot.exists() ? (snapshot.val() as ProvisionResultRecord) : null));
  }

  /** `POST /ever-connect/provision/intent`: checks the intent and seals it; creates nothing. */
  async intent(jws: unknown) {
    const claims = await this.verifyIntent(jws);
    const connection = await this.connected();
    const txn: ProvisionTxn = {
      jti: claims.jti,
      sub: claims.person.ever_id_sub,
      org: {
        id: claims.org.id,
        handle: claims.org.handle,
        displayName: claims.org.display_name,
      },
      returnTo: checkPublicUrl(claims.return_to),
      // The confirmation is valid while the intent is, and never longer than 15 minutes.
      exp: Math.min(claims.exp, this.nowS() + INTENT_MAX_TTL_S),
    };
    return {
      provisionTxn: seal(
        JSON.stringify(txn),
        this.settings.recJwtSecret,
        connection.registryInstanceId,
        'provision-txn',
      ),
      jti: txn.jti,
      handle: txn.org.handle,
      displayName: txn.org.displayName,
      expiresAt: txn.exp * 1000,
    };
  }

  private async open(provisionTxn: unknown): Promise<ProvisionTxn> {
    const connection = await this.connected();
    let txn: ProvisionTxn;
    try {
      txn = JSON.parse(
        open(
          String(provisionTxn ?? ''),
          this.settings.recJwtSecret,
          connection.registryInstanceId,
          'provision-txn',
        ),
      );
    } catch (error) {
      if (error instanceof SealError || error instanceof SyntaxError) {
        throw refuse(BadRequestException, 400, 'invalid_txn', 'This confirmation is not valid.');
      }
      throw error;
    }
    if (!isDbKey(txn.jti)) {
      throw refuse(BadRequestException, 400, 'invalid_txn', 'This confirmation is not valid.');
    }
    if (txn.exp <= this.nowS()) {
      throw refuse(ConflictException, 409, 'intent_expired', 'This link has expired: start again from app.ever.co.');
    }
    return txn;
  }

  /** Whether the account holds an Ever ID link with this subject. */
  private async hasEverId(uid: string, subject: string): Promise<boolean> {
    if (!isDbKey(uid)) return false;
    const db = this.store.db();
    const index = (await db.ref(`${EVER_ID_LINK_ROOTS.byUid}/${uid}`).get()).val() ?? {};
    for (const key of Object.keys(index)) {
      if (!isDbKey(key)) continue;
      const row = (await db.ref(`${EVER_ID_LINK_ROOTS.links}/${key}`).get()).val();
      if (row?.uid === uid && row?.subject === subject) return true;
    }
    return false;
  }

  /**
   * `POST /ever-connect/provision/confirm`: the person, signed in with the intent's Ever ID,
   * confirms. One workspace is created (`admin` = the person), linked to the organization, and Ever
   * Platform is told. A replay answers `exists`.
   */
  async confirm(provisionTxn: unknown, uid: string) {
    const txn = await this.open(provisionTxn);
    if (!(await this.hasEverId(uid, txn.sub))) {
      throw refuse(
        ForbiddenException,
        403,
        'intent_subject_mismatch',
        'Sign in with the same Ever ID you used on app.ever.co.',
      );
    }
    const path = `${EVER_CONNECT_PATHS.provisionResults}/${txn.jti}`;
    const now = this.clock();
    const claim = await this.store
      .db()
      .ref(path)
      .transaction((current: ProvisionResultRecord | null) =>
        current ? undefined : { state: 'creating', at: now, uid },
      );
    if (!claim.committed) {
      const existing = await this.result(txn.jti);
      if (existing?.state === 'created' && existing.uid === uid) {
        return { status: 'exists', workspaceId: existing.workspaceId, returnTo: txn.returnTo };
      }
      throw refuse(ConflictException, 409, 'intent_consumed', 'This link was already used.');
    }
    let workspaceId: string;
    try {
      workspaceId = await this.workspaces.create(uid, txn.org.displayName);
    } catch (error) {
      await this.store.db().ref(path).remove();
      throw error;
    }
    const record: ProvisionResultRecord = {
      state: 'created',
      at: now,
      uid,
      workspaceId,
      tenantLinkId: null,
      pendingComplete: true,
      org: txn.org,
    };
    await this.store.db().ref(path).set(record);
    await this.store.setLink({
      workspaceId,
      tenantLinkId: '',
      everOrgId: txn.org.id,
      handle: txn.org.handle,
      state: 'active',
      linkedAt: now,
      linkedBy: uid,
      displayName: txn.org.displayName,
    });
    await this.audit.write('provision.accept', uid, {}, workspaceId);
    await this.complete(txn.jti).catch((error) =>
      this.logger.warn(`The provisioning could not be reported yet (${errorCode(error)}); retried later.`),
    );
    return { status: 'created', workspaceId, returnTo: txn.returnTo };
  }

  /** `POST /ever-connect/provision/intents/:jti/reject`: the person declines. */
  async reject(jti: string, provisionTxn: unknown) {
    const txn = await this.open(provisionTxn);
    if (txn.jti !== jti) {
      throw refuse(BadRequestException, 400, 'invalid_txn', 'This confirmation is not valid.');
    }
    const path = `${EVER_CONNECT_PATHS.provisionResults}/${jti}`;
    const record: ProvisionResultRecord = {
      state: 'refused',
      at: this.clock(),
      pendingComplete: true,
    };
    const claim = await this.store
      .db()
      .ref(path)
      .transaction((current: ProvisionResultRecord | null) => (current ? undefined : record));
    if (!claim.committed) {
      const existing = await this.result(jti);
      if (existing?.state === 'refused') return { status: 'refused', returnTo: txn.returnTo };
      throw refuse(ConflictException, 409, 'intent_consumed', 'This link was already used.');
    }
    await this.audit.write('provision.refuse', 'system', {});
    await this.complete(jti).catch((error) =>
      this.logger.warn(`The refusal could not be reported yet (${errorCode(error)}); retried later.`),
    );
    return { status: 'refused', returnTo: txn.returnTo };
  }

  /** Tells Ever Platform what happened to an intent (`/v1/provision-intents/{jti}/complete`). */
  async complete(jti: string): Promise<void> {
    const connection = await this.connected();
    const path = `${EVER_CONNECT_PATHS.provisionResults}/${jti}`;
    const record = await this.result(jti);
    if (!record?.pendingComplete) return;
    const app = checkPublicUrl(this.config.portalUrl);
    const body =
      record.state === 'created'
        ? {
            instance_id: connection.registryInstanceId,
            product_tenant_id: record.workspaceId as string,
            product_user_ref: record.uid as string,
            ...(app ? { urls: { app } } : {}),
            result: 'created' as const,
          }
        : {
            instance_id: connection.registryInstanceId,
            product_tenant_id: 'none',
            result: 'refused' as const,
          };
    let tenantLinkId: string | null = null;
    try {
      const answer = await this.client.run((client) =>
        client.connect.completeProvisionIntent(jti, body as never),
      );
      tenantLinkId = answer.tenant_link_id ?? null;
    } catch (error) {
      // An intent the platform no longer holds is final: nothing to retry.
      if (!(platformAnswered(error) && [404, 409, 410].includes(error.status))) throw error;
    }
    await this.store.db().ref(path).update({ pendingComplete: null, tenantLinkId });
    if (record.state === 'created' && record.workspaceId && tenantLinkId) {
      await this.store.patchLink(record.workspaceId, { tenantLinkId });
      await this.fetchLinkEntitlement(record.workspaceId, tenantLinkId);
    }
  }

  private async fetchLinkEntitlement(workspaceId: string, tenantLinkId: string) {
    try {
      await this.client.run(async (client) => {
        const verified = await this.entitlements.fetchLink(client, tenantLinkId, null);
        if (!verified) return;
        const facts: Partial<LinkRecord> = linkFacts(verified);
        await this.store.patchLink(workspaceId, {
          ...facts,
          entitlement: storedFrom(verified, this.clock()),
        });
      });
    } catch (error) {
      this.logger.warn(`The link's entitlement could not be read yet (${errorCode(error)}).`);
    }
  }

  /** Reports the results the platform did not hear about yet (called by the heartbeat). */
  async retryPendingCompletes(): Promise<void> {
    const all =
      (await this.store.db().ref(EVER_CONNECT_PATHS.provisionResults).get()).val() ?? {};
    for (const [jti, record] of Object.entries(all as Record<string, ProvisionResultRecord>)) {
      if (!record?.pendingComplete || record.state === 'creating') continue;
      await this.complete(jti).catch(() => undefined);
    }
  }
}
