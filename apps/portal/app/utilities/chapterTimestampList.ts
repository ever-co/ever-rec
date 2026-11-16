import type { IChapter } from 'app/interfaces/IChapter';
import { CHAPTER_MIN_CHAPTERS } from 'misc/appConstConfig';

const ONE_HOUR = 3600;

const pad = (value: number) => String(value).padStart(2, '0');

// Whole seconds, like the editor, which stores `~~currentTime`.
const formatTimestamp = (totalSeconds: number, withHours: boolean) => {
  const seconds = Math.floor(totalSeconds);
  const hours = Math.floor(seconds / ONE_HOUR);
  const minutes = Math.floor((seconds % ONE_HOUR) / 60);
  const rest = seconds % 60;

  return withHours
    ? `${hours}:${pad(minutes)}:${pad(rest)}`
    : `${pad(minutes)}:${pad(rest)}`;
};

/**
 * Turns a video's chapters into a plain "00:00 Title" list, one chapter per
 * line, ready to paste into a description or a message.
 *
 * Every line uses the same format: "mm:ss" when the last chapter starts
 * before one hour, otherwise "h:mm:ss". The time comes from
 * `timestampSeconds`, the value the player seeks to.
 *
 * Returns `null` when the chapters are not ready to be shared as a list:
 * fewer than the editor's minimum, a missing or negative start time, the first
 * one not at 00:00, or any chapter without a title. The input is never mutated.
 */
export const buildChapterTimestampList = (
  chapters: IChapter[] | null | undefined,
): string | null => {
  if (!Array.isArray(chapters) || chapters.length < CHAPTER_MIN_CHAPTERS)
    return null;

  const hasValidTimes = chapters.every(
    (chapter) =>
      Number.isFinite(chapter?.timestampSeconds) &&
      chapter.timestampSeconds >= 0,
  );

  if (!hasValidTimes) return null;

  const sorted = [...chapters].sort(
    (a, b) => a.timestampSeconds - b.timestampSeconds,
  );

  if (Math.floor(sorted[0].timestampSeconds) !== 0) return null;

  const withHours = sorted[sorted.length - 1].timestampSeconds >= ONE_HOUR;
  const lines: string[] = [];

  for (const chapter of sorted) {
    // A title must stay on one line, otherwise it would break the list.
    const title = (chapter.content ?? '').replace(/\s+/g, ' ').trim();

    if (!title) return null;

    lines.push(
      `${formatTimestamp(chapter.timestampSeconds, withHours)} ${title}`,
    );
  }

  return lines.join('\n');
};
