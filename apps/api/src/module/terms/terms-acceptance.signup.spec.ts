/**
 * A sign-up whose terms record fails keeps its account, and the failure is sent to Sentry as well as logged
 * (#276: on 2026-11-26 production lost every sign-up record for hours and only a log line said so).
 */
jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn() }));
jest.mock('terms-acceptance/firebase', () => {
  const { MemoryAcceptanceAdapter: Memory } =
    jest.requireActual('terms-acceptance');
  return {
    FirebaseAcceptanceAdapter: jest.fn().mockImplementation(() => new Memory()),
  };
});

import * as Sentry from '@sentry/nestjs';
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

describe('TermsAcceptanceService.recordAtSignUp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('stores the record and sends nothing when the write works', async () => {
    const service = newService();

    await expect(
      service.recordAtSignUp('uid-1', claimsFrom(service), {}, 'password'),
    ).resolves.toBe(true);

    expect((await service.status('uid-1', 'en')).satisfied).toBe(true);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it.each(['password', 'ever-id'] as const)(
    'does not throw and reports to Sentry when the write fails (%s sign-up)',
    async (flow) => {
      const service = newService();
      const failure = new Error(
        '7 PERMISSION_DENIED: Cloud Firestore API has not been used',
      );
      jest.spyOn(service, 'record').mockRejectedValueOnce(failure);

      await expect(
        service.recordAtSignUp('uid-1', claimsFrom(service), {}, flow),
      ).resolves.toBe(false);

      expect(Sentry.captureException).toHaveBeenCalledWith(failure, {
        level: 'error',
        tags: { area: 'terms-acceptance', flow: `${flow}-signup` },
      });
      // The uid stays out of Sentry.
      expect(
        JSON.stringify((Sentry.captureException as jest.Mock).mock.calls),
      ).not.toContain('uid-1');
    },
  );

  it('reports a non-Error rejection as an Error', async () => {
    const service = newService();
    jest.spyOn(service, 'record').mockRejectedValueOnce('quota');

    await service.recordAtSignUp('uid-1', claimsFrom(service), {}, 'password');

    const [reported] = (Sentry.captureException as jest.Mock).mock.calls[0];
    expect(reported).toBeInstanceOf(Error);
    expect(reported.message).toBe('quota');
  });
});
