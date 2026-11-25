/**
 * `GET /workspace/:id/members?limit=` pages through the members of a workspace. The query string
 * goes through the same pipe the controller uses, so these tests cover what a client really gets.
 */
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import {
  GetPopulatedMembersDto,
  MAX_POPULATED_MEMBERS_LIMIT,
} from './get-populated-members.dto';

const pipe = new ValidationPipe({ transform: true, whitelist: true });

const parse = (query: Record<string, unknown>) =>
  pipe.transform(query, {
    type: 'query',
    metatype: GetPopulatedMembersDto,
  }) as Promise<GetPopulatedMembersDto>;

describe('GetPopulatedMembersDto', () => {
  it('accepts a request without a limit', async () => {
    expect((await parse({})).limit).toBeUndefined();
  });

  it.each([
    ['1', 1],
    ['20', 20],
    ['40', 40],
    [String(MAX_POPULATED_MEMBERS_LIMIT), MAX_POPULATED_MEMBERS_LIMIT],
  ])('turns limit %p into the number %p', async (raw, expected) => {
    expect((await parse({ limit: raw })).limit).toBe(expected);
  });

  it.each(['0', '-5', '1.5', '12abc', 'abc', '', ' 20'])(
    'ignores limit %p, so the default window is listed',
    async (raw) => {
      expect((await parse({ limit: raw })).limit).toBeUndefined();
    },
  );

  it('rejects a limit above the maximum', async () => {
    await expect(
      parse({ limit: String(MAX_POPULATED_MEMBERS_LIMIT + 1) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a limit sent twice', async () => {
    await expect(parse({ limit: ['20', '40'] })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
