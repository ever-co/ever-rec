import { buildChapterTimestampList } from 'app/utilities/chapterTimestampList';
import type { IChapter } from 'app/interfaces/IChapter';

const chapter = (
  id: string,
  timestamp: string,
  timestampSeconds: number,
  content: string,
): IChapter => ({
  id,
  timestamp,
  timestampSeconds,
  content,
  thumbnailURL: '',
  refName: '',
});

describe('buildChapterTimestampList', () => {
  const ready = [
    chapter('a', '00:00', 0, 'Introduction'),
    chapter('b', '00:45', 45, 'Setup'),
    chapter('c', '01:30:05', 5405, 'Wrap up'),
  ];

  it('writes one "timestamp title" line per chapter', () => {
    expect(buildChapterTimestampList(ready)).toBe(
      '00:00 Introduction\n00:45 Setup\n01:30:05 Wrap up',
    );
  });

  it('orders by time without mutating the input', () => {
    const shuffled = [ready[2], ready[0], ready[1]];
    const snapshot = [...shuffled];

    expect(buildChapterTimestampList(shuffled)).toBe(
      '00:00 Introduction\n00:45 Setup\n01:30:05 Wrap up',
    );
    expect(shuffled).toEqual(snapshot);
  });

  it('keeps each title on a single line', () => {
    const list = buildChapterTimestampList([
      chapter('a', '00:00', 0, '  Intro\nand   welcome '),
      ready[1],
      ready[2],
    ]);

    expect(list?.split('\n')).toEqual([
      '00:00 Intro and welcome',
      '00:45 Setup',
      '01:30:05 Wrap up',
    ]);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty list', []],
    ['the untouched default chapter', [chapter('a', '00:00', 0, '')]],
    ['two chapters', ready.slice(0, 2)],
  ])('returns null for %s', (_name, input) => {
    expect(buildChapterTimestampList(input as IChapter[])).toBeNull();
  });

  it('returns null when the first chapter does not start at 00:00', () => {
    expect(
      buildChapterTimestampList([
        chapter('a', '00:05', 5, 'Intro'),
        ready[1],
        ready[2],
      ]),
    ).toBeNull();
  });

  it('returns null when any chapter has no title', () => {
    expect(
      buildChapterTimestampList([
        ready[0],
        chapter('b', '00:45', 45, '   '),
        ready[2],
      ]),
    ).toBeNull();
  });
});
