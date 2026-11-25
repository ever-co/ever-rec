import { BadRequestException } from '@nestjs/common';
import { IChapter } from 'src/interfaces/IChapter';
import { is_id } from '../../workspace/validators/id.validator';
import { is_plain_file_name } from '../../workspace/validators/video-filename.validator';

/** Most chapters one video can hold. */
export const MAX_CHAPTERS = 200;
/** Longest chapter title, in characters. */
export const MAX_CHAPTER_CONTENT_LENGTH = 1000;
/** Longest chapter id. The editors make 21-character nanoid ids. */
export const MAX_CHAPTER_ID_LENGTH = 128;

/**
 * A chapter id becomes a database key and the storage file name `<id>.jpg`, so
 * it must be a short plain id. The service also collects the chapters in a
 * plain object keyed by id, where a name such as `__proto__` or `constructor`
 * would be lost, so those are refused too.
 */
const isChapterId = (id: unknown): id is string =>
  typeof id === 'string' &&
  id.length <= MAX_CHAPTER_ID_LENGTH &&
  is_id(id) &&
  !(id in Object.prototype);

/**
 * Reads one JSON list of chapters from a multipart form field.
 *
 * The id of a chapter becomes a database key and part of a storage file name,
 * so it must be a plain id. A stored thumbnail name (`refName`) is later used
 * to build storage paths, so it must be one plain file name. A field that is
 * missing, is not JSON, is not a list, holds too many chapters, or holds a
 * chapter with a bad or repeated id, a bad thumbnail name, or a title that is
 * not text or is too long is refused with a 400, instead of crashing the route
 * or writing a broken record.
 */
export const parseChapterList = (
  raw: unknown,
  fieldName: string,
): IChapter[] => {
  if (typeof raw !== 'string') {
    throw new BadRequestException(`"${fieldName}" must be a JSON list`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestException(`"${fieldName}" must be valid JSON`);
  }

  if (!Array.isArray(parsed)) {
    throw new BadRequestException(`"${fieldName}" must be a list`);
  }

  if (parsed.length > MAX_CHAPTERS) {
    throw new BadRequestException(
      `"${fieldName}" can hold at most ${MAX_CHAPTERS} chapters`,
    );
  }

  const seen = new Set<string>();

  for (const chapter of parsed) {
    if (!chapter || typeof chapter !== 'object' || Array.isArray(chapter)) {
      throw new BadRequestException(`"${fieldName}" has an invalid chapter`);
    }

    const { id, content, refName } = chapter as Record<string, unknown>;

    if (!isChapterId(id) || seen.has(id)) {
      throw new BadRequestException(`"${fieldName}" has an invalid chapter id`);
    }
    seen.add(id);

    // Older chapters have no thumbnail name or an empty one.
    if (
      refName !== undefined &&
      refName !== null &&
      refName !== '' &&
      !is_plain_file_name(refName)
    ) {
      throw new BadRequestException(
        `"${fieldName}" has an invalid chapter thumbnail name`,
      );
    }

    if (
      content !== undefined &&
      (typeof content !== 'string' ||
        content.length > MAX_CHAPTER_CONTENT_LENGTH)
    ) {
      throw new BadRequestException(
        `"${fieldName}" has an invalid chapter title`,
      );
    }
  }

  return parsed as IChapter[];
};
