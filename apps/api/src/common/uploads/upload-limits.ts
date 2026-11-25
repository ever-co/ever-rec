import type { MulterModuleOptions as MulterOptions } from '@nestjs/platform-express';

const KiB = 1024;
const MiB = 1024 * KiB;

/**
 * Largest file, in bytes, for each kind of upload. Each is taken from what the web app, the
 * browser extension and the desktop app send.
 */
export const UPLOAD_FILE_BYTES = {
  /**
   * A picture as the user picked or shot it: a profile picture, a workspace or team icon or
   * thumbnail, a camera shot, an image file. The clients send it unchanged.
   */
  picture: 10 * MiB,
  /**
   * An image of the library at full size: a screenshot the web app or the extension captured or
   * edited, a frame of a video. The JSON route that stores a new screenshot (`POST image/upload`)
   * takes 50 MB too.
   */
  image: 50 * MiB,
  /** A sound recording of the desktop app. */
  audio: 100 * MiB,
  /** A video. Only for routes that write the upload to disk, never to memory. */
  video: 1024 * MiB,
} as const;

/**
 * Most text fields one upload may carry. The desktop app sends 11 with a video, the most of any
 * client.
 */
export const MAX_UPLOAD_FIELDS = 20;

/** Longest text field of an upload, in bytes: titles, names, URLs and small JSON documents. */
export const MAX_UPLOAD_FIELD_BYTES = 64 * KiB;

export interface UploadLimits {
  /** Largest file, in bytes. */
  fileSize: number;
  /** Most files. Defaults to one. */
  files?: number;
  /** Most text fields. Defaults to MAX_UPLOAD_FIELDS. */
  fields?: number;
  /** Longest text field, in bytes. Defaults to MAX_UPLOAD_FIELD_BYTES. */
  fieldSize?: number;
}

/**
 * Multer options for an upload route. Multer keeps the upload in API memory unless `storage`
 * writes it to disk, and by default it caps neither the file size nor the number of files, text
 * fields or parts, so one request could hold any amount of memory. These options cap all of them;
 * an upload over a cap is refused while it is read: 413 for a file that is too large, 400 for
 * anything else.
 *
 * @param limits The caps of the route.
 * @param options Other multer options of the route, such as a disk `storage`.
 */
export function uploadOptions(
  {
    fileSize,
    files = 1,
    fields = MAX_UPLOAD_FIELDS,
    fieldSize = MAX_UPLOAD_FIELD_BYTES,
  }: UploadLimits,
  options: Omit<MulterOptions, 'limits'> = {},
): MulterOptions {
  return {
    ...options,
    limits: {
      fileSize,
      files,
      fields,
      fieldSize,
      // The parser refuses a form once it has read `parts` parts, even when the last of them ends
      // the form, so the cap is one above the most fields and files a form may carry.
      parts: fields + files + 1,
    },
  };
}
