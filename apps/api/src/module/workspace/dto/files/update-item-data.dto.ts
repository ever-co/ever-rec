import {
  IsString,
  MaxLength,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { LikeDto } from './like.dto';
import { CanBe, IsNonPrimitiveArray } from '../../../../utils/validator';
import { IsOptionalId } from '../../validators/id.validator';

export class UpdateItemDataDto {
  @CanBe(undefined)
  @IsString()
  @MaxLength(256)
  title?: string;

  @CanBe(undefined)
  @IsBoolean()
  trash?: boolean;

  @CanBe(undefined)
  @ValidateNested({ each: true })
  @IsNonPrimitiveArray()
  @Type(() => LikeDto)
  likes?: LikeDto[];

  @CanBe(undefined)
  @IsOptionalId()
  parentId?: string | false;

  @CanBe(undefined)
  stage?: any;

  @CanBe(undefined)
  @IsString()
  originalImage?: string;

  @CanBe(undefined)
  @IsString()
  markers?: string;
}
