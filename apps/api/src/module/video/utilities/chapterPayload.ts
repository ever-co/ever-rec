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
/** Longest chapter timestamp. The editors send text such as "00:00" or "123:03:59". */
export const MAX_CHAPTER_TIMESTAMP_LENGTH = 16;
/**
 * Longest chapter thumbnail URL. The editors send `''`, a `blob:` URL or the signed storage URL
 * the API made, which stays well under it.
 */
export const MAX_CHAPTER_THUMBNAIL_URL_LENGTH = 4096;

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

/** Text of at most `maxLength` characters. */
const isShortText = (value: unknown, maxLength: number): value is string =>
  typeof value === 'string' && value.length <= maxLength;

/** Missing, or text of at most `maxLength` characters. */
const isOptionalShortText = (
  value: unknown,
  maxLength: number,
): value is string | undefined =>
  value === undefined || isShortText(value, maxLength);

/** Missing, or a finite number of seconds of at least 0. */
const isOptionalSeconds = (value: unknown): value is number | undefined =>
  value === undefined ||
  (typeof value === 'number' && Number.isFinite(value) && value >= 0);

/** Older chapters have no thumbnail name or an empty one. */
const isOptionalRefName = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  value === '' ||
  is_plain_file_name(value);

const invalidChapter = (fieldName: string, what: string) =>
  new BadRequestException(`"${fieldName}" has an invalid chapter ${what}`);

/**
 * Checks one chapter of the list and returns a new chapter that holds only the
 * fields the editors send. The database refuses `undefined`, so a field that
 * was not sent stays out, and a missing thumbnail URL becomes `''`.
 */
const readChapter = (
  chapter: unknown,
  fieldName: string,
  seen: Set<string>,
): IChapter => {
  if (!chapter || typeof chapter !== 'object' || Array.isArray(chapter)) {
    throw new BadRequestException(`"${fieldName}" has an invalid chapter`);
  }

  const { id, content, timestamp, timestampSeconds, thumbnailURL, refName } =
    chapter as Record<string, unknown>;

  if (!isChapterId(id) || seen.has(id)) {
    throw invalidChapter(fieldName, 'id');
  }
  seen.add(id);

  if (!isOptionalRefName(refName)) {
    throw invalidChapter(fieldName, 'thumbnail name');
  }
  if (!isOptionalShortText(content, MAX_CHAPTER_CONTENT_LENGTH)) {
    throw invalidChapter(fieldName, 'title');
  }
  if (!isShortText(timestamp, MAX_CHAPTER_TIMESTAMP_LENGTH)) {
    throw invalidChapter(fieldName, 'timestamp');
  }
  if (!isOptionalSeconds(timestampSeconds)) {
    throw invalidChapter(fieldName, 'time in seconds');
  }
  if (!isOptionalShortText(thumbnailURL, MAX_CHAPTER_THUMBNAIL_URL_LENGTH)) {
    throw invalidChapter(fieldName, 'thumbnail URL');
  }

  const kept: Partial<IChapter> = { id };
  if (content !== undefined) kept.content = content;
  kept.timestamp = timestamp;
  if (timestampSeconds !== undefined) kept.timestampSeconds = timestampSeconds;
  kept.thumbnailURL = thumbnailURL ?? '';
  if (typeof refName === 'string') kept.refName = refName;
  return kept as IChapter;
};

/**
 * Reads one JSON list of chapters from a multipart form field.
 *
 * The id of a chapter becomes a database key and part of a storage file name,
 * so it must be a plain id. A stored thumbnail name (`refName`) is later used
 * to build storage paths, so it must be one plain file name. The video page,
 * the share page included, renders the timestamp as text and reads the
 * thumbnail URL as text, so the timestamp must be short text, the seconds a
 * number of at least 0, and the thumbnail URL text when it is sent. A field
 * that is missing, is not JSON, is not a list, holds too many chapters, or
 * holds a chapter with a bad or repeated id, a bad thumbnail name, a title
 * that is not text or is too long, or a bad timestamp, seconds or thumbnail
 * URL is refused with a 400, instead of crashing the route or writing a broken
 * record.
 *
 * It returns new chapters that hold only the fields the editors send, so a
 * field of any other name is never stored or served to share-link viewers. A
 * chapter sent without a thumbnail URL gets an empty one.
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
  return parsed.map((chapter) => readChapter(chapter, fieldName, seen));
};
