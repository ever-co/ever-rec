// cspell:words traduora

export type EverAppId =
  | 'platform'
  | 'works'
  | 'teams'
  | 'gauzy'
  | 'rec'
  | 'traduora'
  | 'demand'
  | 'tech';

/** The i18n key of the one line under an app's name (`everApps.lines.*` in i18n/locales). */
export type EverAppLineKey = `everApps.lines.${EverAppId}`;

export interface EverAppEntry {
  id: EverAppId;
  /** The product's name: the same in every language and in every Ever app. */
  name: string;
  logo: string;
  lineKey: EverAppLineKey;
}

export interface EverAppRow extends EverAppEntry {
  /** Empty for the current app: its row is not a link. */
  url: string;
  isCurrent: boolean;
}

export interface EverAppSwitcherModel {
  apps: EverAppRow[];
  /** "+ Add" goes to `<platform>/apps?add=app`; null when the deployment links no Ever Platform. */
  addUrl: string | null;
}

export const CURRENT_EVER_APP_ID: EverAppId = 'rec';

// Same list, order and lines in every Ever app and site (homelab `docs/brand/EVER-SITES-UNIFIED-CHROME.md` §4 and
// §4b; the in-app order of `docs/handoffs/HANDOVER-2026-11-26-ever-app-switcher-in-apps.md` §2b). Keep the copies in
// sync. No link lives here: each one comes from the deployment (NEXT_PUBLIC_EVER_APP_LINKS, a build arg), so an
// open-source or self-hosted build names no Ever host and shows no switcher.
export const EVER_APP_ENTRIES: ReadonlyArray<EverAppEntry> = [
  { id: 'platform', name: 'Ever Platform', logo: '/ever-apps/platform.svg', lineKey: 'everApps.lines.platform' },
  { id: 'works', name: 'Ever Works', logo: '/ever-apps/works.svg', lineKey: 'everApps.lines.works' },
  { id: 'teams', name: 'Ever Teams', logo: '/ever-apps/teams.svg', lineKey: 'everApps.lines.teams' },
  { id: 'gauzy', name: 'Ever Gauzy', logo: '/ever-apps/gauzy.svg', lineKey: 'everApps.lines.gauzy' },
  { id: 'rec', name: 'Ever Rec', logo: '/ever-apps/rec.svg', lineKey: 'everApps.lines.rec' },
  { id: 'traduora', name: 'Ever Traduora', logo: '/ever-apps/traduora.png', lineKey: 'everApps.lines.traduora' },
  { id: 'demand', name: 'Ever Demand', logo: '/ever-apps/demand.svg', lineKey: 'everApps.lines.demand' },
  { id: 'tech', name: 'Ever Tech', logo: '/ever-apps/tech.svg', lineKey: 'everApps.lines.tech' },
];

const KNOWN_IDS = new Set<string>(EVER_APP_ENTRIES.map((entry) => entry.id));

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    const isHttp = url.protocol === 'https:' || url.protocol === 'http:';
    return isHttp ? url : null;
  } catch {
    return null;
  }
}

/**
 * NEXT_PUBLIC_EVER_APP_LINKS: `id=url` pairs separated by commas, for example
 * `platform=https://app.ever.co,works=https://app.ever.works`. Unknown ids, entries without `=` and links that are not
 * http(s) are ignored. Same format as Ever Teams' parser.
 */
export function parseEverAppLinks(raw: string | undefined): Map<EverAppId, URL> {
  const links = new Map<EverAppId, URL>();
  for (const entry of (raw ?? '').split(',')) {
    const separator = entry.indexOf('=');
    if (separator <= 0) {
      continue;
    }
    const id = entry.slice(0, separator).trim();
    if (!KNOWN_IDS.has(id)) {
      continue;
    }
    const url = parseHttpUrl(entry.slice(separator + 1).trim());
    if (url) {
      links.set(id as EverAppId, url);
    }
  }
  return links;
}

/** Ever Platform's "Add an app" page, without an organization in the address: Platform opens the dialog. */
export function everAppsAddUrl(platformUrl: URL): string {
  return new URL('/apps?add=app', platformUrl).href;
}

/**
 * What the switcher shows for a links value: the current app (not a link) and every app the deployment links, in
 * catalog order, plus "+ Add" when Ever Platform is linked. Null when no other app is linked, so the switcher, its
 * mark included, is not rendered at all.
 */
export function buildEverAppSwitcher(
  raw: string | undefined,
  current: EverAppId = CURRENT_EVER_APP_ID,
): EverAppSwitcherModel | null {
  const links = parseEverAppLinks(raw);
  const apps: EverAppRow[] = [];
  for (const entry of EVER_APP_ENTRIES) {
    const isCurrent = entry.id === current;
    const link = links.get(entry.id);
    if (isCurrent) {
      apps.push({ ...entry, url: '', isCurrent });
    } else if (link) {
      apps.push({ ...entry, url: link.href, isCurrent });
    }
  }
  const linksAnotherApp = apps.some((app) => !app.isCurrent);
  if (!linksAnotherApp) {
    return null;
  }
  const platform = current === 'platform' ? null : links.get('platform');
  return { apps, addUrl: platform ? everAppsAddUrl(platform) : null };
}

// Next.js inlines NEXT_PUBLIC_* at build time only when the name is written out in full, as here.
export const EVER_APP_SWITCHER = buildEverAppSwitcher(process.env.NEXT_PUBLIC_EVER_APP_LINKS);
