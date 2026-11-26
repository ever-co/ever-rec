/**
 * `status` + `reaccept`: a signed-in user without a record (a sign-up whose write failed, as on 2026-11-26 when
 * production had no Firestore) is blocked until they accept the current texts, and only the current texts count.
 *
 * The Firestore adapter is swapped for the package's in-memory adapter, so the real recorder, corpus checks and
 * status evaluation run unchanged.
 */
import { BadRequestException } from '@nestjs/common';

jest.mock('terms-acceptance/firebase', () => {
  const { MemoryAcceptanceAdapter: Memory } =
    jest.requireActual('terms-acceptance');
  return {
    FirebaseAcceptanceAdapter: jest.fn().mockImplementation(() => new Memory()),
  };
});

import { TermsAcceptanceService } from './terms-acceptance.service';

const newService = () =>
  new TermsAcceptanceService({ firestore: () => ({}) } as any);
const claimsFrom = (service: TermsAcceptanceService) =>
  service
    .getRequiredDocuments('en')
    .map(({ documentId, version, sha256, locale }) => ({
      documentId,
      version,
      sha256,
      locale,
    }));

describe('TermsAcceptanceService status and reaccept', () => {
  it('blocks an account that has no acceptance on file', async () => {
    const service = newService();

    const status = await service.status('uid-1', 'en');

    expect(status.satisfied).toBe(false);
    expect(status.blocking.map((d) => d.reason)).toEqual(
      status.blocking.map(() => 'never-accepted'),
    );
    expect(status.blocking.map((d) => d.documentId).sort()).toEqual(
      claimsFrom(service)
        .map((c) => c.documentId)
        .sort(),
    );
  });

  it('records the current texts and answers satisfied', async () => {
    const service = newService();

    const status = await service.reaccept('uid-1', claimsFrom(service), {
      ip: '203.0.113.9',
      userAgent: 'jest',
    });

    expect(status.satisfied).toBe(true);
    expect(status.blocking).toEqual([]);
    const history = await service.history('uid-1');
    expect(history.map((r) => r.method)).toEqual(
      history.map(() => 'reaccept-modal'),
    );
    expect(history).toHaveLength(claimsFrom(service).length);
  });

  it('treats a second accept of the same texts as done, not as an error', async () => {
    const service = newService();
    await service.reaccept('uid-1', claimsFrom(service), {});

    const again = await service.reaccept('uid-1', claimsFrom(service), {});

    expect(again.satisfied).toBe(true);
    expect(await service.history('uid-1')).toHaveLength(
      claimsFrom(service).length,
    );
  });

  it('refuses a digest that was never published', async () => {
    const service = newService();
    const [first, ...rest] = claimsFrom(service);

    await expect(
      service.reaccept(
        'uid-1',
        [{ ...first, sha256: 'f'.repeat(64) }, ...rest],
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await service.history('uid-1')).toHaveLength(0);
  });

  it('refuses a document that is not required now', async () => {
    const service = newService();
    jest
      .spyOn(service, 'assertClaimsArePublished')
      .mockImplementation(() => undefined);
    const [first] = claimsFrom(service);

    await expect(
      service.reaccept(
        'uid-1',
        [{ ...first, documentId: 'cookies:ever-rec' }],
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await service.history('uid-1')).toHaveLength(0);
  });

  it('refuses an older version of a required document', async () => {
    const service = newService();
    jest
      .spyOn(service, 'assertClaimsArePublished')
      .mockImplementation(() => undefined);
    const [first] = claimsFrom(service);

    await expect(
      service.reaccept('uid-1', [{ ...first, version: '0.0.1' }], {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
