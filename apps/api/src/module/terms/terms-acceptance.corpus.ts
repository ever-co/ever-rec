import { selectRequiredDocuments } from 'terms-acceptance';
import type { CorpusIndex, RequiredDocument } from 'terms-acceptance';

/** The product id this deployment publishes under in the legal corpus. */
export const TERMS_PRODUCT = 'ever-rec';

/**
 * The published legal corpus.
 *
 * `require` rather than a JSON `import`: the API compiles to CommonJS without
 * `resolveJsonModule`, and `@ever-co/legal` exposes its index only through its
 * `exports` map — the on-disk `dist/index.json` path is deliberately not
 * importable. This is the one specifier TypeScript and Node both accept.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const corpus = require('@ever-co/legal/index.json') as CorpusIndex;

/**
 * The documents a new account must accept, straight from the corpus.
 *
 * Each carries the `sha256` of the document *source*, which is what makes an
 * acceptance provable rather than merely asserted: check the corpus out at that
 * version, re-run the build, re-hash, compare. Nothing downstream invents a
 * version or a digest — they come from here or they are rejected.
 */
export function getRequiredTermsDocuments(locale?: string): RequiredDocument[] {
  return selectRequiredDocuments(corpus, {
    product: TERMS_PRODUCT,
    locale,
    url: (doc) => `/legal/${doc.document}`,
  });
}
