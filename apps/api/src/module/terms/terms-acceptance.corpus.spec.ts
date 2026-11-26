/**
 * The sign-up form must ask for the texts https://rec.so publishes (tos 1.2.0 since 2026-10-05). With
 * `@ever-co/legal` 0.1.2 it asked for tos 1.0.2, so every acceptance pointed at a text the site no longer showed.
 *
 * People who accepted tos 1.0.2 before the bump must not be blocked: 1.0.2 -> 1.2.0 is a minor change (the corpus
 * declares no history, so semver decides), which `status()` reports as a notice.
 */
import { evaluateAcceptance } from 'terms-acceptance';
import { getRequiredTermsDocuments } from './terms-acceptance.corpus';

describe('Ever Rec terms corpus', () => {
  const required = getRequiredTermsDocuments('en');
  const byId = Object.fromEntries(required.map((doc) => [doc.documentId, doc]));

  it('requires the Terms of Service and Privacy Policy that rec.so publishes', () => {
    expect(Object.keys(byId).sort()).toEqual([
      'privacy:ever-rec',
      'tos:ever-rec',
    ]);
    expect(byId['tos:ever-rec'].version).toBe('1.2.0');
    expect(byId['privacy:ever-rec'].version).toBe('1.0.2');
    for (const doc of required) {
      expect(doc.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(doc.locale).toBe('en');
    }
  });

  it('gives someone who accepted tos 1.0.2 a notice for 1.2.0, not a block', () => {
    const accepted = [
      {
        documentId: 'tos:ever-rec',
        version: '1.0.2',
        sha256: 'a'.repeat(64),
        acceptedAt: '2026-11-26T09:53:10.000Z',
      },
      {
        documentId: 'privacy:ever-rec',
        version: '1.0.2',
        sha256: byId['privacy:ever-rec'].sha256,
        acceptedAt: '2026-11-26T09:53:10.000Z',
      },
    ];

    const status = evaluateAcceptance(required, accepted as any);

    expect(status.satisfied).toBe(true);
    expect(status.blocking).toEqual([]);
    expect(
      status.notices.map((doc) => `${doc.documentId}:${doc.reason}`),
    ).toEqual(['tos:ever-rec:minor-change']);
    expect(status.current).toEqual(['privacy:ever-rec']);
  });

  it('blocks someone who never accepted anything', () => {
    const status = evaluateAcceptance(required, []);

    expect(status.satisfied).toBe(false);
    expect(status.blocking.map((doc) => doc.reason)).toEqual([
      'never-accepted',
      'never-accepted',
    ]);
  });
});
