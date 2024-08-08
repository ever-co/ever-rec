import { matches, Matches } from 'class-validator';
import { ValidationOptions } from 'class-validator/types/decorator/ValidationOptions';

export const IMAGE_FILENAME_REGEX = /^([A-Za-z0-9_-]*).(jpg|jpeg|png|gif)$/;

export function is_image_filename(value: string) {
  return matches(value, IMAGE_FILENAME_REGEX);
}

export const IsImageFilename = (validationOptions?: ValidationOptions) =>
  Matches(IMAGE_FILENAME_REGEX, validationOptions);
