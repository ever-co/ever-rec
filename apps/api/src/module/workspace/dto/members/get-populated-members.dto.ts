import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { CanBe } from '../../../../utils/validator';

/** Largest `limit` accepted: the end of the window of members to list. */
export const MAX_POPULATED_MEMBERS_LIMIT = 10000;

export class GetPopulatedMembersDto {
  @CanBe(undefined)
  @IsInt()
  @Min(1)
  @Max(MAX_POPULATED_MEMBERS_LIMIT)
  // The transform runs before the validators, so the check has to be on the number. Anything that
  // is not plain digits is left as it is and fails `IsInt`.
  @Transform(({ value }) =>
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value,
  )
  limit?: number;
}
