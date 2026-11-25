import { BadRequestException } from '@nestjs/common';
import {
  MAX_CHAPTERS,
  MAX_CHAPTER_CONTENT_LENGTH,
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
    ])('a chapter with %s', (_name, id) => {
      const list = JSON.stringify([chapter('ok'), { ...chapter('x'), id }]);

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
