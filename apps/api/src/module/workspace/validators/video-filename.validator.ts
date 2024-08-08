import { matches, Matches } from 'class-validator';
import { ValidationOptions } from 'class-validator/types/decorator/ValidationOptions';

export const VIDEO_FILENAME_REGEX = /^([A-Za-z0-9_-]*).(mp4|webm|mov|ogg)$/;

export function is_video_filename(value: string) {
  return matches(value, VIDEO_FILENAME_REGEX);
}

export const IsVideoFilename = (validationOptions?: ValidationOptions) =>
  Matches(VIDEO_FILENAME_REGEX, validationOptions);
