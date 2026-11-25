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
  const short = [
    chapter('a', '00:00', 0, 'Introduction'),
    chapter('b', '00:45', 45, 'Setup'),
    chapter('c', '59:59', 3599, 'Wrap up'),
  ];

  const ready = [
    chapter('a', '00:00', 0, 'Introduction'),
    chapter('b', '00:45', 45, 'Setup'),
    chapter('c', '01:30:05', 5405, 'Wrap up'),
  ];

  it('writes one "mm:ss title" line per chapter when every chapter starts before one hour', () => {
    expect(buildChapterTimestampList(short)).toBe(
      '00:00 Introduction\n00:45 Setup\n59:59 Wrap up',
    );
  });

  it('writes "h:mm:ss" on every line once a chapter starts at one hour or later', () => {
    expect(buildChapterTimestampList(ready)).toBe(
      '0:00:00 Introduction\n0:00:45 Setup\n1:30:05 Wrap up',
    );
  });

  it('orders by time without mutating the input', () => {
    const shuffled = [ready[2], ready[0], ready[1]];
    const snapshot = [...shuffled];

    expect(buildChapterTimestampList(shuffled)).toBe(
      '0:00:00 Introduction\n0:00:45 Setup\n1:30:05 Wrap up',
    );
    expect(shuffled).toEqual(snapshot);
  });

  it('takes the time from timestampSeconds and drops fractions of a second', () => {
    expect(
      buildChapterTimestampList([
        chapter('a', '00:00', 0, 'Intro'),
        chapter('b', '9:9', 69.9, 'Middle'),
        chapter('c', '', 600, 'End'),
      ]),
    ).toBe('00:00 Intro\n01:09 Middle\n10:00 End');
  });

  it('keeps each title on a single line', () => {
    const list = buildChapterTimestampList([
      chapter('a', '00:00', 0, '  Intro\nand   welcome '),
      short[1],
      short[2],
    ]);

    expect(list?.split('\n')).toEqual([
      '00:00 Intro and welcome',
      '00:45 Setup',
      '59:59 Wrap up',
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

  it.each([
    ['missing', undefined],
    ['not a number', Number.NaN],
    ['negative', -5],
  ])('returns null when a start time is %s', (_name, seconds) => {
    expect(
      buildChapterTimestampList([
        ready[0],
        chapter('b', '00:45', seconds as number, 'Setup'),
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
