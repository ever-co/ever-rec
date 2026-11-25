import { BadRequestException } from '@nestjs/common';
import { IChapter } from 'src/interfaces/IChapter';
import { is_id } from '../../workspace/validators/id.validator';

/** Most chapters one video can hold. */
export const MAX_CHAPTERS = 200;
/** Longest chapter title, in characters. */
export const MAX_CHAPTER_CONTENT_LENGTH = 1000;

/**
 * Reads one JSON list of chapters from a multipart form field.
 *
 * The id of a chapter becomes a database key and part of a storage file name,
 * so it must be a plain id. A field that is missing, is not JSON, is not a
 * list, holds too many chapters, or holds a chapter with a bad or repeated id
 * or a title that is not text or is too long is refused with a 400, instead of
 * crashing the route or writing a broken record.
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

    const { id, content } = chapter as Record<string, unknown>;

    if (typeof id !== 'string' || !is_id(id) || seen.has(id)) {
      throw new BadRequestException(`"${fieldName}" has an invalid chapter id`);
    }
    seen.add(id);

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
