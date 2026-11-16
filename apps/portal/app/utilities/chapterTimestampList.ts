import type { IChapter } from 'app/interfaces/IChapter';

// Same limits the chapter editor enforces when saving, so a copied list is
// one that other players and description fields recognise as chapters.
const MIN_CHAPTERS = 3;

/**
 * Turns a video's chapters into a plain "00:00 Title" list, one chapter per
 * line, ready to paste into a description or a message.
 *
 * Returns `null` when the chapters are not ready to be shared as a list:
 * fewer than three, the first one not at 00:00, or any chapter without a
 * title. The input is never mutated.
 */
export const buildChapterTimestampList = (
  chapters: IChapter[] | null | undefined,
): string | null => {
  if (!Array.isArray(chapters) || chapters.length < MIN_CHAPTERS) return null;

  const sorted = [...chapters].sort(
    (a, b) => a.timestampSeconds - b.timestampSeconds,
  );

  if (sorted[0].timestampSeconds !== 0) return null;

  const lines: string[] = [];

  for (const chapter of sorted) {
    // A title must stay on one line, otherwise it would break the list.
    const title = (chapter.content ?? '').replace(/\s+/g, ' ').trim();
    const timestamp = (chapter.timestamp ?? '').trim();

    if (!title || !timestamp) return null;

    lines.push(`${timestamp} ${title}`);
  }

  return lines.join('\n');
};
