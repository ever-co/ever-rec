/**
 * Where the published Rec legal texts are read (https://rec.so/tos, /privacy). Same default as the API's
 * `TERMS_SITE_URL`; a build that overrides one sets `NEXT_PUBLIC_TERMS_SITE_URL` for the other.
 */
export const LEGAL_SITE_URL = (
  process.env.NEXT_PUBLIC_TERMS_SITE_URL || 'https://rec.so'
).replace(/\/$/, '');

/**
 * The link to a legal document the person is asked to accept.
 *
 * The API sends an absolute `url` for each required document. Older API builds sent `/legal/<document>`, which
 * resolves nowhere on the portal, so anything that is not an absolute http(s) URL falls back to the document on
 * the Rec website. `documentId` is `<document>:<product>`, e.g. `tos:ever-rec`.
 */
export function legalDocumentUrl(
  doc: { documentId: string; url?: string } | undefined,
  fallbackDocument: string,
): string {
  if (doc?.url && /^https?:\/\//i.test(doc.url)) return doc.url;
  const document = doc?.documentId?.split(':')[0] || fallbackDocument;
  return `${LEGAL_SITE_URL}/${document}`;
}

/** The link for one kind of document (`tos`, `privacy`) out of the documents the API required. */
export function legalUrlFor(
  documents: { documentId: string; url?: string }[],
  document: string,
): string {
  return legalDocumentUrl(
    documents.find((doc) => doc.documentId.split(':')[0] === document),
    document,
  );
}
