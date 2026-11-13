import { SetMetadata } from '@nestjs/common';

export const NAMED_IMAGE_WRITE_METADATA = 'namedImageWrite';

export interface NamedImageWriteOptions {
  /**
   * The stored file name the request writes to, read from the parsed request (body or query).
   * Anything that is not a non-empty string is refused, unless `nameOptional` is set.
   */
  fileName: (req: any) => unknown | Promise<unknown>;
  /** True: the name must belong to an image of this workspace (the route replaces an image). */
  mustExist?: boolean;
  /** Also require WRITE on the folder named by `folderId` in the body (multipart uploads). */
  checkBodyFolder?: boolean;
  /** True: a request that names no file writes nothing, so it is left to the handler. */
  nameOptional?: boolean;
}

/**
 * Marks a route that writes an image file under a name taken from the request, so the per-image
 * WRITE rule can be applied to the image that is actually written. Pair it with
 * `@UseInterceptors(FileInterceptor(...), NamedImageWriteInterceptor)`, in that order: a guard
 * runs before the multipart body is parsed, so only an interceptor placed after the file
 * interceptor can read the name and folder of an upload.
 */
export const NamedImageWrite = (options: NamedImageWriteOptions) =>
  SetMetadata(NAMED_IMAGE_WRITE_METADATA, options);
