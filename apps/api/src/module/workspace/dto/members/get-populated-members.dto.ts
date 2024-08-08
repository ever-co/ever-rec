import { Transform } from 'class-transformer';
import { IsNumberString } from 'class-validator';
import { CanBe } from '../../../../utils/validator';

export class GetPopulatedMembersDto {
  @CanBe(undefined)
  @IsNumberString()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;
}
