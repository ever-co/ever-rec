import { IChapter } from 'src/interfaces/IChapter';

/**
 * The host of every signed link the API makes for a chapter thumbnail. The chapter service calls
 * `getSignedUrl` with no `cname` and no `virtualHostedStyle`, so the storage library signs
 * path-style links: `https://storage.googleapis.com/<bucket>/<file>?...`.
 */
export const SIGNED_URL_HOST = 'storage.googleapis.com';

/**
 * Whether `url` is a link the API itself could have signed: https, on the storage host with no
 * port and no user name, and in the API's own bucket.
 */
export const isOwnStorageURL = (url: unknown, bucketName: string): boolean => {
  if (typeof url !== 'string' || !bucketName) return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  return (
    parsed.protocol === 'https:' &&
    parsed.host === SIGNED_URL_HOST &&
    parsed.username === '' &&
    parsed.password === '' &&
    parsed.pathname.startsWith(`/${bucketName}/`)
  );
};

/**
 * The chapters with only the thumbnail URLs the API made. The video page, the share page
 * included, loads every chapter thumbnail URL in the viewer's browser, so a URL on any other host
 * would tell that host who watched and when. A chapter keeps its thumbnail URL when it is `''` or
 * a signed link of the API's own bucket; any other URL becomes `''`, and its thumbnail name
 * (`refName`) is dropped, as for a chapter with no thumbnail.
 *
 * `bucketName` is read only when a chapter has a thumbnail URL.
 */
export const keepOwnThumbnails = (
  chapters: IChapter[],
  bucketName: () => string,
): IChapter[] => {
  let name: string | undefined;

  return chapters.map((chapter) => {
    if (
      !chapter ||
      typeof chapter !== 'object' ||
      chapter.thumbnailURL === ''
    ) {
      return chapter;
    }

    if (name === undefined) name = bucketName();
    if (isOwnStorageURL(chapter.thumbnailURL, name)) return chapter;

    const withoutThumbnail: IChapter = { ...chapter, thumbnailURL: '' };
    delete withoutThumbnail.refName;
    return withoutThumbnail;
  });
};
