import { Injectable } from '@nestjs/common';
import { FirebaseAdminService } from '../../firebase/services/firebase-admin.service';
import { identityKey } from './ever-id-crypto.service';

/** Realtime Database roots of the link table. */
export const EVER_ID_LINK_ROOTS = {
  /** `ever_identities/{sha256(issuer NUL subject)}` → {@link EverIdLink}. */
  links: 'ever_identities',
  /** `ever_identities_by_uid/{uid}/{key}` → `true`. */
  byUid: 'ever_identities_by_uid',
} as const;

/**
 * How the link came to be: `explicit` = connected from Settings by a signed-in person; `jit` =
 * created together with the account after the person confirmed the sign-up screen; `provisioned` is
 * reserved for links created by a connected-instance module.
 */
export type EverIdLinkMethod = 'explicit' | 'jit' | 'provisioned';

/** A link between an Ever ID `(issuer, subject)` and a Rec account. No token is ever stored here. */
export interface EverIdLink {
  issuer: string;
  subject: string;
  uid: string;
  everPersonId?: string | null;
  emailAtLink: string;
  linkMethod: EverIdLinkMethod;
  linkedAt: number;
  lastLoginAt: number | null;
}

/** What the owner of an account sees about one of their links. */
export interface EverIdIdentitySummary {
  issuer: string;
  subject: string;
  email: string;
  linkMethod: EverIdLinkMethod;
  linkedAt: number;
  lastLoginAt: number | null;
}

/** The subject is already linked to another Rec account. */
export class EverIdSubjectLinkedError extends Error {
  constructor() {
    super('This Ever ID is already connected to another account.');
    this.name = 'EverIdSubjectLinkedError';
  }
}

export interface EverIdLinkInput {
  issuer: string;
  subject: string;
  uid: string;
  everPersonId?: string | null;
  emailAtLink: string;
  linkMethod: EverIdLinkMethod;
}

/**
 * The `(issuer, subject) → uid` table.
 *
 * Sign-in resolves an Ever ID by its key only, never by e-mail. One subject belongs to at most one
 * account; an account may hold several links (one per issuer).
 */
@Injectable()
export class EverIdLinkService {
  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  key(issuer: string, subject: string): string {
    return identityKey(issuer, subject);
  }

  async resolve(issuer: string, subject: string): Promise<EverIdLink | null> {
    const snapshot = await this.linkRef(this.key(issuer, subject)).get();
    return snapshot.exists() ? (snapshot.val() as EverIdLink) : null;
  }

  /**
   * Writes a link. Re-linking the same subject to the same account refreshes it; a subject that
   * belongs to another account throws {@link EverIdSubjectLinkedError} and nothing is written.
   */
  async link(input: EverIdLinkInput): Promise<EverIdLink> {
    const key = this.key(input.issuer, input.subject);
    const now = Date.now();
    let conflict = false;
    let written: EverIdLink | null = null;

    await this.linkRef(key).transaction((current: EverIdLink | null) => {
      // The update function may run more than once; only the last run counts.
      conflict = false;
      written = null;
      if (current && current.uid !== input.uid) {
        conflict = true;
        return undefined; // abort: the subject belongs to someone else
      }
      written = {
        issuer: input.issuer,
        subject: input.subject,
        uid: input.uid,
        everPersonId: input.everPersonId ?? current?.everPersonId ?? null,
        emailAtLink: input.emailAtLink,
        linkMethod: current?.linkMethod ?? input.linkMethod,
        linkedAt: current?.linkedAt ?? now,
        lastLoginAt: current?.lastLoginAt ?? null,
      };
      return written;
    });

    if (conflict || !written) {
      throw new EverIdSubjectLinkedError();
    }
    await this.indexRef(input.uid, key).set(true);
    return written;
  }

  /** Records a sign-in with the link. */
  async touch(
    issuer: string,
    subject: string,
    everPersonId?: string | null,
  ): Promise<void> {
    const update: Partial<EverIdLink> = { lastLoginAt: Date.now() };
    if (everPersonId) {
      update.everPersonId = everPersonId;
    }
    await this.linkRef(this.key(issuer, subject)).update(update);
  }

  /** Removes the caller's own link; `false` when the caller holds no such link. */
  async unlink(uid: string, issuer: string, subject: string): Promise<boolean> {
    const key = this.key(issuer, subject);
    const existing = await this.resolve(issuer, subject);
    if (!existing || existing.uid !== uid) {
      return false;
    }
    await this.firebaseAdminService
      .getDatabase()
      .ref()
      .update({
        [`${EVER_ID_LINK_ROOTS.links}/${key}`]: null,
        [`${EVER_ID_LINK_ROOTS.byUid}/${uid}/${key}`]: null,
      });
    return true;
  }

  async listForUser(uid: string): Promise<EverIdIdentitySummary[]> {
    const index = await this.firebaseAdminService
      .getDatabaseRef(`${EVER_ID_LINK_ROOTS.byUid}/${uid}`)
      .get();
    const keys = index.exists() ? Object.keys(index.val() ?? {}) : [];
    const links = await Promise.all(
      keys.map(
        async (key) =>
          (await this.linkRef(key).get()).val() as EverIdLink | null,
      ),
    );
    return links
      .filter((link): link is EverIdLink => !!link && link.uid === uid)
      .map((link) => ({
        issuer: link.issuer,
        subject: link.subject,
        email: link.emailAtLink,
        linkMethod: link.linkMethod,
        linkedAt: link.linkedAt,
        lastLoginAt: link.lastLoginAt ?? null,
      }))
      .sort((a, b) => a.linkedAt - b.linkedAt);
  }

  private linkRef(key: string) {
    return this.firebaseAdminService.getDatabaseRef(
      `${EVER_ID_LINK_ROOTS.links}/${key}`,
    );
  }

  private indexRef(uid: string, key: string) {
    return this.firebaseAdminService.getDatabaseRef(
      `${EVER_ID_LINK_ROOTS.byUid}/${uid}/${key}`,
    );
  }
}
