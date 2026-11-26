/**
 * Terms-of-service acceptance.
 *
 * The register page rendered a TOS checkbox, used it to compute `valid`, and
 * then called `register(email, password, username)` with the value unreferenced.
 * It gated the submit button and stopped there: no argument, no request field,
 * no record. These two shapes are what carry it the rest of the way.
 */

/**
 * One document the user must accept, as published by `GET /api/v1/terms/required`.
 *
 * `sha256` is the digest of the document source in `@ever-co/legal`. Storing it
 * with the acceptance is what makes the acceptance provable: check the corpus
 * out at that version, re-run the build, re-hash, compare.
 */
export interface ITermsAcceptanceDocument {
  documentId: string;
  version: string;
  sha256: string;
  locale: string;
  url?: string;
  title?: string;
  effectiveDate?: string;
}

/**
 * What the signup form posts back for one document — the same fields the server
 * published, echoed verbatim.
 *
 * The server re-checks each against the corpus before writing: a value that
 * arrived from a browser is a claim, not evidence.
 */
export interface ITermsAcceptanceClaim {
  documentId: string;
  version: string;
  sha256: string;
  locale: string;
}

/** One document the signed-in user still has to accept (`GET /api/v1/terms/status`). */
export interface ITermsPendingDocument {
  documentId: string;
  reason:
    | 'never-accepted'
    | 'material-change'
    | 'minor-change'
    | 'text-mismatch'
    | string;
  blocking: boolean;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  requiredVersion: string;
  requiredSha256: string;
  title?: string;
  url?: string;
}

/** Whether the signed-in user has accepted what is required now. */
export interface ITermsStatus {
  satisfied: boolean;
  blocking: ITermsPendingDocument[];
  notices: ITermsPendingDocument[];
  current: string[];
}
