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
  // The transform runs before the validators, so the check has to be on the number. A string that
  // is not a whole number of 1 or more (`0`, `-5`, `abc`, `1.5`) becomes `undefined`, so the
  // service lists the default first window. A value that is not a string, such as a repeated
  // `limit`, is left as it is and fails `IsInt`. A number above the maximum fails `Max`.
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    if (!/^\d+$/.test(value)) return undefined;
    const parsed = Number(value);
    return parsed >= 1 ? parsed : undefined;
  })
  limit?: number;
}
