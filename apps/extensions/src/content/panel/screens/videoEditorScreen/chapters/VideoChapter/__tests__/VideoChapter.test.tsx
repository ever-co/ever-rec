import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@/test/render';
import { IChapter } from '@/content/panel/hooks/useVideoChapters';
import VideoChapter from '../VideoChapter';

// The extension's chapter list loads each chapter thumbnail URL for every workspace member who
// opens the video, so a URL on any other host let that host see who watched. A thumbnail is now
// shown only for a blob: URL (a frame the editor just captured) or a link on the storage host
// the API signs.

jest.mock('@/content/components/elements/AppSvg', () => () => null);
jest.mock(
  '../../VideoChapterContentInput/VideoChapterContentInput',
  () => () => null,
);

const PLACEHOLDER = 'images/panel/videos/chapter-placeholder.jpg';
const SIGNED =
  'https://storage.googleapis.com/rec-test.appspot.com/users/u1/videosThumbnails/v1/a1.jpg?GoogleAccessId=rec%40rec-test.iam.gserviceaccount.com&Expires=16725225600&Signature=c2lnbmVk';

const chapter = (thumbnailURL: string, refName = 'a1.jpg'): IChapter =>
  ({
    id: 'a1',
    content: 'Intro',
    timestamp: '00:00',
    timestampSeconds: 0,
    thumbnailURL,
    refName,
  }) as IChapter;

const thumbnailOf = (value: IChapter) => {
  const container = render(
    <VideoChapter
      isFirst={false}
      chapter={value}
      chapterActive={false}
      chapterClicked={() => undefined}
      chapterUpdated={() => undefined}
      chapterClosed={() => undefined}
    />,
  );
  const images = container.querySelectorAll('img');
  expect(images).toHaveLength(1);
  return images[0].getAttribute('src');
};

describe('VideoChapter thumbnail', () => {
  it.each([
    ['a foreign host', 'https://other.example/p.jpg'],
    ['an .svg on a foreign host', 'https://other.example/p.svg'],
    ['a foreign link with "blob" in it', 'https://other.example/blob.svg'],
    ['a javascript: URL', 'javascript:alert(document.cookie)'],
    [
      'a plain http link to the storage host',
      SIGNED.replace('https:', 'http:'),
    ],
    [
      'a host that only starts with the storage host',
      'https://storage.googleapis.com.other.example/p.svg',
    ],
  ])('shows the placeholder for %s', (_name, url) => {
    expect(thumbnailOf(chapter(url))).toBe(PLACEHOLDER);
  });

  it('shows a signed storage link', () => {
    expect(thumbnailOf(chapter(SIGNED))).toBe(SIGNED);
  });

  it('shows a frame the editor just captured', () => {
    const blob = 'blob:chrome-extension://extension-id/0b5f6c1e';
    expect(thumbnailOf(chapter(blob, ''))).toBe(blob);
  });

  it('shows the placeholder for a chapter with no thumbnail', () => {
    expect(thumbnailOf(chapter('', ''))).toBe(PLACEHOLDER);
  });
});
