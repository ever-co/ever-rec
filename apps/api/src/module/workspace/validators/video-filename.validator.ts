import { matches, Matches } from 'class-validator';
import { ValidationOptions } from 'class-validator/types/decorator/ValidationOptions';

export const VIDEO_FILENAME_REGEX = /^[A-Za-z0-9_-]*\.(mp4|webm|mov|ogg)$/;

export function is_video_filename(value: string) {
  return matches(value, VIDEO_FILENAME_REGEX);
}

/**
 * True for a value that is safe as one storage path segment: 1 to 256 characters, no `/`, no `\`,
 * no control character, and not `.` or `..`. It does not restrict the extension: a personal video
 * can have any extension the upload route maps a media type to (for example `.avi` or `.wmv`),
 * and copying it into a workspace must keep working.
 */
export function is_plain_file_name(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= 256 &&
    value !== '.' &&
    value !== '..' &&
    // eslint-disable-next-line no-control-regex
    !/[/\\\u0000-\u001f\u007f]/.test(value)
  );
}

export const IsVideoFilename = (validationOptions?: ValidationOptions) =>
  Matches(VIDEO_FILENAME_REGEX, validationOptions);
