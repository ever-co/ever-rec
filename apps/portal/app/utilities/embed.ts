const SHARED_VIDEO_PATH = /^\/video\/shared\/([^/]+)\/?$/;
const MAX_TITLE_LENGTH = 200;
const DEFAULT_TITLE = 'Rec video';

/**
 * Turns a public share link (`<origin>/video/shared/<id>[?ws=1]`) into the URL of the
 * player-only embed page (`<origin>/video/shared/embed/<id>[?ws=1]`).
 * Returns null for anything that is not a public video share link.
 */
export const getVideoEmbedUrl = (sharedLink: string): string | null => {
  let url: URL;
  try {
    url = new URL(sharedLink);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const match = SHARED_VIDEO_PATH.exec(url.pathname);
  if (!match) return null;

  const embedUrl = new URL(url.origin);
  embedUrl.pathname = `/video/shared/embed/${match[1]}`;
  if (url.searchParams.get('ws') === '1') embedUrl.search = '?ws=1';

  return embedUrl.toString();
};

const escapeAttribute = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** Builds a copy-paste `<iframe>` snippet. The title is user content, so it is escaped and bounded. */
export const buildVideoEmbedCode = (
  embedUrl: string,
  title?: string | null,
): string => {
  const safeTitle =
    (title || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LENGTH) ||
    DEFAULT_TITLE;

  return (
    `<iframe src="${escapeAttribute(embedUrl)}" title="${escapeAttribute(safeTitle)}" ` +
    'width="640" height="360" style="border:0;max-width:100%;height:auto;aspect-ratio:16/9" ' +
    'allow="fullscreen" allowfullscreen loading="lazy"></iframe>'
  );
};
