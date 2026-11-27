import {
  legalDocumentUrl,
  legalUrlFor,
} from 'app/services/helpers/legalDocumentUrl';

// The sign-up forms linked the terms to https://rec.com/tos and /privacy, which are 404 on a site that is not ours,
// and the API's `/legal/<document>` resolves nowhere on the portal. The published texts are on https://rec.so.
describe('legal document links', () => {
  const documents = [
    { documentId: 'tos:ever-rec', url: 'https://rec.so/tos' },
    { documentId: 'privacy:ever-rec', url: '/legal/privacy' },
  ];

  it('uses an absolute URL from the API as is', () => {
    expect(legalUrlFor(documents, 'tos')).toBe('https://rec.so/tos');
  });

  it('sends a relative or missing URL to the document on rec.so', () => {
    expect(legalUrlFor(documents, 'privacy')).toBe('https://rec.so/privacy');
    expect(legalUrlFor([], 'tos')).toBe('https://rec.so/tos');
    expect(legalDocumentUrl(undefined, 'privacy')).toBe(
      'https://rec.so/privacy',
    );
  });
});
