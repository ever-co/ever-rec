import { BadRequestException } from '@nestjs/common';
import {
  MAX_CHAPTERS,
  MAX_CHAPTER_CONTENT_LENGTH,
  MAX_CHAPTER_ID_LENGTH,
  parseChapterList,
} from './chapterPayload';

const chapter = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  timestamp: '00:00',
  timestampSeconds: 0,
  content: 'Intro',
  thumbnailURL: '',
  ...extra,
});

const parse = (value: unknown) => parseChapterList(value, 'chapters');

// The video page shows `timestamp` as text and reads `thumbnailURL` as text, so both are bounded.
// The editors send timestamps such as "00:00" or "123:03:59".
const MAX_TIMESTAMP_LENGTH = 16;
const MAX_THUMBNAIL_URL_LENGTH = 4096;

describe('parseChapterList', () => {
  describe('keeps what the editor sends', () => {
    it('returns an empty list', () => {
      expect(parse('[]')).toEqual([]);
    });

    it('returns the chapters untouched, with every field the editor adds', () => {
      const chapters = [
        chapter('abc123', { refName: 'abc123.jpg' }),
        chapter('Q_-9zZ', { content: '' }),
        chapter('noContentKey', { content: undefined }),
      ];

      expect(parse(JSON.stringify(chapters))).toEqual(
        JSON.parse(JSON.stringify(chapters)),
      );
    });

    it('accepts exactly the largest list and the longest title', () => {
      const chapters = Array.from({ length: MAX_CHAPTERS }, (_, i) =>
        chapter(`id${i}`, { content: 'x'.repeat(MAX_CHAPTER_CONTENT_LENGTH) }),
      );

      expect(parse(JSON.stringify(chapters))).toHaveLength(MAX_CHAPTERS);
    });

    it('accepts the longest id', () => {
      const list = JSON.stringify([chapter('a'.repeat(MAX_CHAPTER_ID_LENGTH))]);

      expect(parse(list)).toHaveLength(1);
    });

    it('accepts the thumbnail names older and newer chapters carry', () => {
      const chapters = [
        chapter('noRef'),
        chapter('emptyRef', { refName: '' }),
        chapter('jpgRef', { refName: 'jpgRef.jpg' }),
      ];

      expect(parse(JSON.stringify(chapters))).toHaveLength(3);
    });

    it('keeps a chapter shaped like the ones the editors send, with all six fields', () => {
      const editorChapter = {
        id: 'V1StGXR8_Z5jdHi6B-myT',
        content: 'Intro',
        timestamp: '01:02:03',
        timestampSeconds: 3723,
        thumbnailURL:
          'https://storage.googleapis.com/bucket/users/u1/videosThumbnails/v1/a.jpg?Signature=abc',
        refName: 'V1StGXR8_Z5jdHi6B-myT.jpg',
      };

      const [parsed] = parse(JSON.stringify([editorChapter]));

      expect(parsed).toStrictEqual(editorChapter);
    });

    it('accepts the longest timestamp, a timestamp at zero seconds and the longest thumbnail URL', () => {
      const chapters = [
        chapter('longTimestamp', {
          timestamp: '9'.repeat(MAX_TIMESTAMP_LENGTH),
        }),
        chapter('zeroSeconds', { timestampSeconds: 0 }),
        chapter('fractionSeconds', { timestampSeconds: 12.5 }),
        chapter('longURL', {
          thumbnailURL: 'h'.repeat(MAX_THUMBNAIL_URL_LENGTH),
        }),
      ];

      expect(parse(JSON.stringify(chapters))).toHaveLength(4);
    });

    // The database refuses a value that is `undefined`.
    it('leaves out the optional fields a chapter was sent without', () => {
      const [parsed] = parse(
        JSON.stringify([{ id: 'a1', timestamp: '00:00' }]),
      );

      expect(parsed).not.toHaveProperty('content');
      expect(parsed).not.toHaveProperty('timestampSeconds');
      expect(parsed).not.toHaveProperty('refName');
    });

    it('gives a chapter with no thumbnail URL an empty one', () => {
      const [parsed] = parse(
        JSON.stringify([{ id: 'a1', content: 'x', timestamp: '00:00' }]),
      );

      expect(parsed.thumbnailURL).toBe('');
    });

    it('drops every field it does not know', () => {
      const raw =
        '[{"id":"a1","content":"x","timestamp":"00:00","timestampSeconds":0,' +
        '"thumbnailURL":"","refName":"","isAdmin":true,"views":{"a":1},' +
        '"__proto__":{"polluted":true}}]';

      const [parsed] = parse(raw);

      expect(Object.keys(parsed).sort()).toEqual(
        [
          'content',
          'id',
          'refName',
          'thumbnailURL',
          'timestamp',
          'timestampSeconds',
        ].sort(),
      );
      expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
      expect((parsed as unknown as Record<string, unknown>).polluted).toBe(
        undefined,
      );
    });

    it('returns new objects, not the ones it parsed', () => {
      const raw = '[{"id":"a1","content":"x","timestamp":"00:00","extra":1}]';

      const [first] = parse(raw);
      const [second] = parse(raw);

      expect(first).not.toBe(second);
      expect(first).toEqual(second);
      expect(first).not.toHaveProperty('extra');
    });
  });

  describe('refuses with a 400', () => {
    it.each([
      ['a missing field', undefined],
      ['a non-string field', ['[]']],
      ['text that is not JSON', '{not json'],
      ['an empty string', ''],
      ['JSON that is not a list', '{"id":"a"}'],
      ['a null', 'null'],
    ])('%s', (_name, value) => {
      expect(() => parse(value)).toThrow(BadRequestException);
    });

    it.each([
      ['a chapter that is null', 'null'],
      ['a chapter that is a string', '"abc"'],
      ['a chapter that is a list', '["abc"]'],
    ])('%s', (_name, item) => {
      expect(() => parse(`[${item}]`)).toThrow(BadRequestException);
    });

    it.each([
      ['no id', undefined],
      ['a number id', 5],
      ['an empty id', ''],
      ['an id with a slash', 'a/b'],
      ['an id that climbs out of its folder', '../x'],
      ['an id with a dot', 'a.b'],
      ['an id with a database-reserved character', 'a$b'],
      ['an id with a space', 'a b'],
      ['an id one character too long', 'a'.repeat(MAX_CHAPTER_ID_LENGTH + 1)],
      ['the id __proto__', '__proto__'],
      ['the id constructor', 'constructor'],
    ])('a chapter with %s', (_name, id) => {
      const list = JSON.stringify([chapter('ok'), { ...chapter('x'), id }]);

      expect(() => parse(list)).toThrow(BadRequestException);
    });

    it.each([
      [
        'a thumbnail name that climbs out of its folder',
        '../../x/videos/a.mp4',
      ],
      ['a thumbnail name with a slash', 'a/b.jpg'],
      ['a thumbnail name with a backslash', 'a\\b.jpg'],
      ['the thumbnail name ..', '..'],
      ['a thumbnail name that is not text', 5],
    ])('a chapter with %s', (_name, refName) => {
      const list = JSON.stringify([chapter('a', { refName })]);

      expect(() => parse(list)).toThrow(BadRequestException);
    });

    it('two chapters with the same id', () => {
      const list = JSON.stringify([chapter('same'), chapter('same')]);

      expect(() => parse(list)).toThrow(BadRequestException);
    });

    it('one chapter more than the largest list', () => {
      const chapters = Array.from({ length: MAX_CHAPTERS + 1 }, (_, i) =>
        chapter(`id${i}`),
      );

      expect(() => parse(JSON.stringify(chapters))).toThrow(
        BadRequestException,
      );
    });

    it.each([
      ['a title that is not text', 12],
      ['a title that is a list', ['a']],
      [
        'a title one character too long',
        'x'.repeat(MAX_CHAPTER_CONTENT_LENGTH + 1),
      ],
    ])('a chapter with %s', (_name, content) => {
      const list = JSON.stringify([chapter('a', { content })]);

      expect(() => parse(list)).toThrow(BadRequestException);
    });

    // The video page renders the timestamp as a React child: an object there throws.
    it.each([
      ['no timestamp', undefined],
      ['a timestamp that is an object', { a: 1 }],
      ['a timestamp that is a list', ['00:00']],
      ['a timestamp that is a number', 12],
      ['a timestamp that is null', null],
      [
        'a timestamp one character too long',
        '9'.repeat(MAX_TIMESTAMP_LENGTH + 1),
      ],
    ])('a chapter with %s', (_name, timestamp) => {
      const list = JSON.stringify([chapter('a', { timestamp })]);

      expect(() => parse(list)).toThrow(BadRequestException);
    });

    it.each([
      ['a timestampSeconds that is a string', '5'],
      ['a timestampSeconds that is negative', -1],
      ['a timestampSeconds that is an object', { a: 1 }],
      ['a timestampSeconds that is null', null],
      ['a timestampSeconds that is a boolean', true],
    ])('a chapter with %s', (_name, timestampSeconds) => {
      const list = JSON.stringify([chapter('a', { timestampSeconds })]);

      expect(() => parse(list)).toThrow(BadRequestException);
    });

    // JSON has no Infinity, but a number too large for a double parses as one.
    it('a chapter with a timestampSeconds that is not finite', () => {
      const list = '[{"id":"a","timestamp":"00:00","timestampSeconds":1e999}]';

      expect(() => parse(list)).toThrow(BadRequestException);
    });

    // The video page calls `thumbnailURL.includes(...)`.
    it.each([
      ['a thumbnail URL that is a number', 5],
      ['a thumbnail URL that is an object', { a: 1 }],
      ['a thumbnail URL that is null', null],
      [
        'a thumbnail URL one character too long',
        'h'.repeat(MAX_THUMBNAIL_URL_LENGTH + 1),
      ],
    ])('a chapter with %s', (_name, thumbnailURL) => {
      const list = JSON.stringify([chapter('a', { thumbnailURL })]);

      expect(() => parse(list)).toThrow(BadRequestException);
    });
  });

  it('names the field that was wrong, and nothing from the request', () => {
    expect.assertions(2);

    try {
      parseChapterList('{not json', 'chaptersBlobs');
    } catch (error) {
      const message = (error as BadRequestException).message;
      expect(message).toContain('chaptersBlobs');
      expect(message).not.toContain('not json');
    }
  });
});
