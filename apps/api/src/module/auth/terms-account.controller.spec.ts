/**
 * `POST /terms/accept` validates its body on the route itself: this API has no global ValidationPipe, so
 * without the route pipe the DTO rules would be decoration only.
 */
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { PIPES_METADATA } from '@nestjs/common/constants';
import { TermsReacceptDto } from './dto/auth.dto';
import { TermsAccountController } from './terms-account.controller';

const claim = {
  documentId: 'tos:ever-rec',
  version: '1.2.0',
  sha256: 'a'.repeat(64),
  locale: 'en',
};
const pipe = new ValidationPipe({ transform: true, whitelist: true });
const check = (body: unknown) =>
  pipe.transform(body, { type: 'body', metatype: TermsReacceptDto });

describe('POST /terms/accept body validation', () => {
  it('has a ValidationPipe on the route', () => {
    const pipes: unknown[] =
      Reflect.getMetadata(
        PIPES_METADATA,
        TermsAccountController.prototype.accept,
      ) ?? [];

    expect(pipes.some((p) => p instanceof ValidationPipe)).toBe(true);
  });

  it('passes a well-formed body', async () => {
    await expect(check({ documents: [claim] })).resolves.toBeInstanceOf(
      TermsReacceptDto,
    );
  });

  it.each([
    ['an empty list', { documents: [] }],
    ['a list that is not an array', { documents: 'tos:ever-rec' }],
    [
      'more than 20 documents',
      { documents: Array.from({ length: 21 }, () => claim) },
    ],
    [
      'a digest that is not lowercase hex',
      { documents: [{ ...claim, sha256: 'A'.repeat(64) }] },
    ],
    [
      'a claim without a locale',
      { documents: [{ ...claim, locale: undefined }] },
    ],
  ])('refuses %s', async (_name, body) => {
    await expect(check(body)).rejects.toBeInstanceOf(BadRequestException);
  });
});
