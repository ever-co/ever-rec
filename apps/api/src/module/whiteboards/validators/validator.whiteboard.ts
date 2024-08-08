import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateWhiteboardValidator {
  @IsNotEmpty({ message: 'Validation error ' })
  // @Length(3, 255)
  name: string;
}

export class UpdateWhiteboardValidator {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  trash: boolean;

  @IsOptional()
  @IsBoolean()
  favorite: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic: boolean;
}
