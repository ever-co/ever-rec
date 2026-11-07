import { Injectable, Logger } from '@nestjs/common';
import type { EverIdSessionIdentity } from '../../auth/services/login/state/ever-id-login.state';
import { MergeTokenPolicy } from '../../auth/services/tokens/policies/merge-token.policy';
import { FirebaseAdminService } from '../../firebase/services/firebase-admin.service';
import { EverIdCryptoService, hashHandle, identityKey } from './ever-id-crypto.service';
import { EverIdStoreService } from './ever-id-store.service';

/** `ever_id_sessions/{sha256(issuer NUL sid)}` → {@link SessionIndexRecord}. */
export const EVER_ID_SESSIONS_ROOT = 'ever_id_sessions';

/** How long a session index entry is kept; longer than any reference token it points at. */
export const SESSION_INDEX_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const SEAL_PURPOSE = 'ever_id_sessions';

interface SessionIndexRecord {
  uid: string;
  /** {@link identityKey} of the Ever ID, to find sessions by subject. */
  subjectKey: string;
  expiresAt: number;
  /** Reference refresh tokens opened with this session id, sealed. */
  tokens?: Record<string, string>;
}

/**
 * Remembers which Rec sessions were opened with which Ever ID session (`sid`), so a back-channel
 * logout ends exactly those sessions and nothing else.
 */
@Injectable()
export class EverIdSessionIndexService {
  private readonly logger = new Logger(EverIdSessionIndexService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly crypto: EverIdCryptoService,
    private readonly store: EverIdStoreService,
    private readonly mergeTokenPolicy: MergeTokenPolicy,
  ) {}

  /** Records the reference token of a session opened with `identity.sid`. */
  async record(identity: EverIdSessionIdentity, uid: string, referenceToken: string): Promise<void> {
    if (!identity.sid) {
      return;
    }
    const ref = this.sessionRef(identity.issuer, identity.sid);
    await ref.update({
      uid,
      subjectKey: identityKey(identity.issuer, identity.subject),
      expiresAt: Date.now() + SESSION_INDEX_TTL_MS,
    });
    await ref.child('tokens').push(this.crypto.seal(SEAL_PURPOSE, referenceToken));
    this.store.sweepSoon(EVER_ID_SESSIONS_ROOT);
  }

  /**
   * Revokes every Rec session opened with this Ever ID session, or with any session of the subject
   * when the logout token names only the subject. Returns the uids whose sessions ended.
   */
  async revoke(issuer: string, sid: string | null, subject: string | null): Promise<string[]> {
    const entries: Array<[string, SessionIndexRecord]> = [];
    if (sid) {
      const key = this.sessionKey(issuer, sid);
      const snapshot = await this.root().child(key).get();
      if (snapshot.exists()) {
        entries.push([key, snapshot.val() as SessionIndexRecord]);
      }
    } else if (subject) {
      const snapshot = await this.root()
        .orderByChild('subjectKey')
        .equalTo(identityKey(issuer, subject))
        .once('value');
      snapshot.forEach((child) => {
        entries.push([child.key, child.val() as SessionIndexRecord]);
        return false;
      });
    }

    const uids = new Set<string>();
    for (const [key, record] of entries) {
      for (const sealed of Object.values(record.tokens ?? {})) {
        const token = this.crypto.open<string>(SEAL_PURPOSE, sealed);
        if (token) {
          await this.revokeQuietly(token);
        }
      }
      await this.root().child(key).remove();
      if (record.uid) {
        uids.add(record.uid);
      }
    }
    return [...uids];
  }

  private async revokeQuietly(token: string): Promise<void> {
    try {
      await this.mergeTokenPolicy.revokeToken(token);
    } catch (error) {
      // Already revoked, already rotated by a refresh, or expired: nothing left to end.
      this.logger.debug(`Reference token not revoked: ${error instanceof Error ? error.message : 'error'}`);
    }
  }

  private root() {
    return this.firebaseAdminService.getDatabaseRef(EVER_ID_SESSIONS_ROOT);
  }

  private sessionKey(issuer: string, sid: string): string {
    return hashHandle(`${issuer}\u0000${sid}`);
  }

  private sessionRef(issuer: string, sid: string) {
    return this.root().child(this.sessionKey(issuer, sid));
  }
}
