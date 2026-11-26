import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import {
  TermsAcceptanceService as Recorder,
  DuplicateAcceptanceError,
  assertPublishedText,
  type AcceptanceMethod,
  type AcceptanceRecord,
  type AcceptanceStatus,
  type RequiredDocument,
} from 'terms-acceptance';
import { FirebaseAcceptanceAdapter } from 'terms-acceptance/firebase';
import type { FirestoreLike } from 'terms-acceptance/firebase';
import { FIREBASE_ADMIN } from '../firebase/firebase.constants';
import { corpus, getRequiredTermsDocuments } from './terms-acceptance.corpus';

/** One document a signup form says it displayed. */
export interface ITermsAcceptanceClaim {
  documentId: string;
  version: string;
  sha256: string;
  locale: string;
}

/**
 * Records terms-of-service acceptance at signup.
 *
 * ## What this fixes
 *
 * `apps/portal/pages/auth/register.tsx` held the checkbox in a `TOS` state
 * variable, used it to compute `valid`, and then called
 * `register(email.value, password.value, username)` — the TOS value was never
 * referenced again. It gated the submit button and went nowhere: no argument, no
 * request field, no document. The user saw a checkbox; nothing was stored.
 *
 * ## Why Firestore
 *
 * Firebase Auth has no place to put an audit row, so the record goes into
 * Firestore through the Admin SDK. Two Firestore details do real work:
 * `DocumentReference.create()` fails if the document already exists, and the
 * document id is derived deterministically from
 * `(subject, tenant, document, version)` — which gives append-only semantics and
 * duplicate rejection for free, so a double-submitted form cannot produce two
 * records that disagree about the time.
 *
 * `FIRESTORE_RULES` (exported by the package) denies create, update and delete
 * to everything rules apply to, and lets a signed-in user read only their own
 * rows. The Admin SDK bypasses rules, so the server still writes — the rules
 * block the browser. See `docs` in the package README before deploying them.
 *
 * ## Claims are checked before they become evidence
 *
 * The digest arrives from a browser, so it is a *claim*. Constructing the
 * recorder with `corpus` routes every write through `assertPublishedText`: an
 * acceptance can never point at text `@ever-co/legal` never published.
 */
@Injectable()
export class TermsAcceptanceService {
  private readonly logger = new Logger(TermsAcceptanceService.name);
  private readonly recorder: Recorder;

  constructor(@Inject(FIREBASE_ADMIN) private readonly app: admin.app.App) {
    this.recorder = new Recorder({
      adapter: new FirebaseAcceptanceAdapter({
        firestore: this.app.firestore() as unknown as FirestoreLike,
      }),
      // Every write is checked against the published corpus.
      corpus,
      // Per-deployment secret. Without it `hashIp` returns null and no IP is
      // recorded at all, which is a legitimate configuration — an *unsalted* IP
      // hash would not be, since all 2^32 IPv4 addresses can be enumerated in
      // seconds.
      ipSalt: process.env.TERMS_IP_SALT,
      // `materiality` stays at the default `'declared-or-semver'`: the corpus
      // does not yet declare a per-document `history`, and `'declared'` would
      // throw on every status check until it does.
    });
  }

  /**
   * The documents a new account must accept, as currently published.
   *
   * Served to the signup form so the client never guesses a version or a digest,
   * and so the object that gates the submit button is the object that gets
   * posted back.
   */
  getRequiredDocuments(locale?: string): RequiredDocument[] {
    return getRequiredTermsDocuments(locale);
  }

  /**
   * Validate claims *before* the Firebase user is created.
   *
   * Rejecting here rather than after signup means a malformed or unpublished
   * claim never strands an account whose owner would then be told their email is
   * already in use. `assertPublishedText` is pure and synchronous, so this is
   * cheap enough for the hot path.
   *
   * @throws BadRequestException when a claim does not match published text.
   */
  assertClaimsArePublished(claims: ITermsAcceptanceClaim[]): void {
    for (const claim of claims) {
      try {
        assertPublishedText(corpus, claim.documentId, claim.version, claim.sha256);
      } catch (error) {
        this.logger.warn(
          `Rejected terms acceptance for unpublished text: ${claim.documentId}@${claim.version} — ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        throw new BadRequestException(
          `Terms acceptance references text that was never published: ${claim.documentId}@${claim.version}.`,
        );
      }
    }
  }

  /**
   * Record the acceptance a signup form collected, against the Firebase uid.
   */
  async record(
    uid: string,
    claims: ITermsAcceptanceClaim[],
    context: {
      method: AcceptanceMethod;
      ip?: string | null;
      userAgent?: string | null;
    },
  ): Promise<AcceptanceRecord[]> {
    const documents: RequiredDocument[] = claims.map(
      ({ documentId, version, sha256, locale }) => ({ documentId, version, sha256, locale }),
    );

    return this.recorder.recordMany(documents, {
      subjectId: uid,
      method: context.method,
      ipHash: this.recorder.hashIp(context.ip),
      userAgent: context.userAgent ?? null,
    });
  }

  /**
   * Whether a signed-in user has accepted the documents currently required.
   *
   * `blocking` lists what they must accept before going on: a document never
   * accepted (a sign-up whose record failed, or an account from before the
   * checkbox was real) or a material new version. `notices` are minor changes.
   */
  async status(uid: string, locale?: string): Promise<AcceptanceStatus> {
    return this.recorder.status(uid, this.getRequiredDocuments(locale));
  }

  /**
   * Record what the re-acceptance dialog showed a signed-in user, then return the
   * new status.
   *
   * Only the documents currently required, at their current version and digest,
   * are accepted: an older text is refused even when it was once published, so a
   * stale tab cannot record consent to terms that no longer apply. Posting a
   * document that is already on file is not an error (a double click, two tabs).
   *
   * @throws BadRequestException when a claim is unpublished or not current.
   */
  async reaccept(
    uid: string,
    claims: ITermsAcceptanceClaim[],
    context: { ip?: string | null; userAgent?: string | null },
  ): Promise<AcceptanceStatus> {
    this.assertClaimsArePublished(claims);
    const locale = claims[0]?.locale;
    // Each claim is checked against the documents required in its own locale, and recorded with the locale of
    // the text that was actually shown: when that locale has no published translation, the required set holds
    // the English fallback, and that is what the person read.
    const requiredByLocale = new Map<string, RequiredDocument[]>();
    const requiredFor = (claimLocale: string): RequiredDocument[] => {
      if (!requiredByLocale.has(claimLocale)) {
        requiredByLocale.set(claimLocale, this.getRequiredDocuments(claimLocale));
      }
      return requiredByLocale.get(claimLocale) as RequiredDocument[];
    };
    const validated = claims.map((claim) => {
      const current = requiredFor(claim.locale).find((doc) => doc.documentId === claim.documentId);
      if (!current || current.version !== claim.version || current.sha256 !== claim.sha256) {
        throw new BadRequestException(
          `Terms acceptance must be for the current text: ${claim.documentId}@${claim.version} is not what is required now.`,
        );
      }
      return { ...claim, locale: current.locale };
    });

    // What is still pending, asked per claim locale: a document can be pending under one locale's required set
    // and not appear in another's. A minor-change notice may be accepted too (the dialog offers only blocking
    // documents, a banner could offer notices): either way the new version is recorded and becomes current.
    const pending = new Set<string>();
    for (const claimLocale of new Set(claims.map((claim) => claim.locale))) {
      const before = await this.status(uid, claimLocale);
      for (const doc of [...before.blocking, ...before.notices]) pending.add(doc.documentId);
    }
    const outstanding = validated.filter((claim) => pending.has(claim.documentId));
    if (outstanding.length) {
      try {
        await this.record(uid, outstanding, { method: 'reaccept-modal', ...context });
      } catch (error) {
        if (!(error instanceof DuplicateAcceptanceError)) throw error;
      }
    }
    return this.status(uid, locale);
  }

  /** Every acceptance on file for a user, newest first, integrity-checked. */
  async history(uid: string): Promise<AcceptanceRecord[]> {
    return this.recorder.history({ subjectId: uid });
  }
}
