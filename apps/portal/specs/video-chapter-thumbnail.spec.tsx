import React from 'react';
import { createRoot, Root } from 'react-dom/client';

import VideoChapter from '../components/pagesComponents/_videoEditorScreen/chapters/VideoChapter/VideoChapter';
import { IChapter } from '../app/interfaces/IChapter';

// The chapter list of the video page, the share page included, loads each chapter thumbnail in
// the viewer's browser. next/legacy/image hands an .svg source to the browser unchanged, so a
// thumbnail URL on any other host let that host see who watched. A thumbnail is now shown only
// for a blob: URL (a frame the editor just captured) or a link on the storage host the API signs.

jest.mock('next/legacy/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));
jest.mock('components/elements/AppSvg', () => ({
  __esModule: true,
  default: () => <span />,
}));
jest.mock(
  'components/pagesComponents/_videoEditorScreen/chapters/VideoChapterContentInput/VideoChapterContentInput',
  () => ({
    __esModule: true,
    default: () => <span />,
  }),
);

// React 18.3 exports `act`; the pinned type definitions do not declare it yet.
const act: (callback: () => void | Promise<void>) => Promise<void> = (
  React as any
).act;

const PLACEHOLDER = '/videos/chapter-placeholder.jpg';
const SIGNED =
  'https://storage.googleapis.com/rec-test.appspot.com/users/u1/videosThumbnails/v1/a1.jpg?GoogleAccessId=rec%40rec-test.iam.gserviceaccount.com&Expires=16725225600&Signature=c2lnbmVk';

const chapter = (thumbnailURL: string, refName = 'a1.jpg'): IChapter => ({
  id: 'a1',
  content: 'Intro',
  timestamp: '00:00',
  timestampSeconds: 0,
  thumbnailURL,
  refName,
});

let container: HTMLDivElement;
let root: Root;

const thumbnailOf = async (value: IChapter) => {
  await act(async () => {
    root.render(
      <VideoChapter
        isPublic
        isFirst={false}
        chapter={value}
        chapterActive={false}
        chapterClicked={() => undefined}
        chapterUpdated={() => undefined}
        chapterClosed={() => undefined}
      />,
    );
  });
  const images = container.querySelectorAll('img');
  expect(images).toHaveLength(1);
  return images[0].getAttribute('src');
};

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

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
    [
      'a link that names the storage host as a user name',
      'https://storage.googleapis.com@other.example/p.svg',
    ],
  ])('shows the placeholder for %s', async (_name, url) => {
    expect(await thumbnailOf(chapter(url))).toBe(PLACEHOLDER);
  });

  it('shows a signed storage link', async () => {
    expect(await thumbnailOf(chapter(SIGNED))).toBe(SIGNED);
  });

  it('shows a frame the editor just captured', async () => {
    const blob = 'blob:http://localhost/0b5f6c1e-6f4f-4b55-9d4c-1f2a3b4c5d6e';
    expect(await thumbnailOf(chapter(blob, ''))).toBe(blob);
  });

  it('shows the placeholder for a chapter with no thumbnail', async () => {
    expect(await thumbnailOf(chapter('', ''))).toBe(PLACEHOLDER);
  });

  // The API saves a thumbnail that is not a JPEG with no name and a link to no file.
  it('shows the placeholder for a storage link with no thumbnail name', async () => {
    expect(await thumbnailOf(chapter(SIGNED, ''))).toBe(PLACEHOLDER);
  });
});
