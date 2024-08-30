import { matches, Matches } from 'class-validator';
import { applyDecorators } from '@nestjs/common';
import { CanBe } from '../../../utils/validator';
import { Transform } from 'class-transformer';
import { ValidationOptions } from 'class-validator/types/decorator/ValidationOptions';

export const ID_REGEX = /^[A-Za-z0-9_-]+$/;

export function is_id(value: string) {
  return matches(value, ID_REGEX);
}

export const IsId = (validationOptions?: ValidationOptions) =>
  Matches(ID_REGEX, validationOptions);

export function is_optional_id(value: string | false) {
  return value === false || value === 'false' || is_id(value);
}

export const IsOptionalId = () =>
  applyDecorators(
    Transform(({ value }) => (value === 'false' ? false : value)),
    CanBe(false),
    IsId()
  );
