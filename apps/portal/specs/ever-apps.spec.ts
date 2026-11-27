/**
 * The Ever app switcher's catalog and its link config (homelab `docs/handoffs/HANDOVER-2026-11-26-ever-app-switcher-in-apps.md`
 * §2, §2b and §3): the same eight apps in the same order as every Ever app, links only from the build's
 * NEXT_PUBLIC_EVER_APP_LINKS, and no switcher at all without them.
 */
import {
  buildEverAppSwitcher,
  EVER_APP_ENTRIES,
  everAppsAddUrl,
  parseEverAppLinks,
} from 'misc/everApps';

const EVER_RUN =
  'platform=https://app.ever.co,works=https://app.ever.works,teams=https://app.ever.team,gauzy=https://app.gauzy.co,' +
  'demand=https://app.everdemand.co,rec=https://app.rec.so,traduora=https://app.traduora.co,tech=https://ever.tech';

describe('EVER_APP_ENTRIES', () => {
  it('lists the eight Ever apps in the shared in-app order, Ever Tech last', () => {
    expect(EVER_APP_ENTRIES.map((app) => app.id)).toEqual([
      'platform',
      'works',
      'teams',
      'gauzy',
      'rec',
      'traduora',
      'demand',
      'tech',
    ]);
  });

  it('gives every app its full name, a local logo and a translated line', () => {
    for (const app of EVER_APP_ENTRIES) {
      expect(app.name).toMatch(/^Ever [A-Z]/);
      expect(app.logo).toMatch(/^\/ever-apps\/[a-z]+\.(svg|png)$/);
      expect(app.lineKey).toBe(`everApps.lines.${app.id}`);
    }
  });
});

describe('parseEverAppLinks', () => {
  it('reads id=url pairs, trimmed, including tech', () => {
    const links = parseEverAppLinks(' tech = https://ever.tech , works=https://app.ever.works ');

    expect(links.get('tech')?.href).toBe('https://ever.tech/');
    expect(links.get('works')?.href).toBe('https://app.ever.works/');
  });

  it('ignores unknown ids, entries without "=" and links that are not http(s)', () => {
    const links = parseEverAppLinks(
      'cloc=https://cloc.com,gauzy,=https://x.example,works=javascript:alert(1),teams=not a url,rec=ftp://rec.so',
    );

    expect(links.size).toBe(0);
  });

  it('is empty for an unset or empty value', () => {
    expect(parseEverAppLinks(undefined).size).toBe(0);
    expect(parseEverAppLinks('').size).toBe(0);
  });
});

describe('everAppsAddUrl', () => {
  it('points at the Platform apps page without an organization, with add=app', () => {
    expect(everAppsAddUrl(new URL('https://app.ever.co'))).toBe('https://app.ever.co/apps?add=app');
    expect(everAppsAddUrl(new URL('https://app-dev.ever.co/'))).toBe('https://app-dev.ever.co/apps?add=app');
  });
});

describe('buildEverAppSwitcher', () => {
  it('shows nothing when the build links no Ever app (self-hosted)', () => {
    expect(buildEverAppSwitcher(undefined)).toBeNull();
    expect(buildEverAppSwitcher('')).toBeNull();
  });

  it('shows nothing when the only link is the current app', () => {
    expect(buildEverAppSwitcher('rec=https://app.rec.so')).toBeNull();
  });

  it('lists all eight apps for the Ever-run config, Rec current and not a link', () => {
    const model = buildEverAppSwitcher(EVER_RUN);

    expect(model?.apps).toHaveLength(8);
    const rec = model?.apps.find((app) => app.id === 'rec');
    expect(rec).toMatchObject({ isCurrent: true, url: '' });
    expect(model?.apps.filter((app) => app.isCurrent)).toHaveLength(1);
    expect(model?.apps.find((app) => app.id === 'tech')?.url).toBe('https://ever.tech/');
    expect(model?.apps.find((app) => app.id === 'works')?.url).toBe('https://app.ever.works/');
    expect(model?.addUrl).toBe('https://app.ever.co/apps?add=app');
  });

  it('lists only the linked apps, in catalog order, and keeps the current one', () => {
    const model = buildEverAppSwitcher('tech=https://ever.tech,teams=https://demo.ever.team');

    expect(model?.apps.map((app) => app.id)).toEqual(['teams', 'rec', 'tech']);
  });

  it('hides "+ Add" when Ever Platform is not linked', () => {
    const model = buildEverAppSwitcher('works=https://app.ever.works');

    expect(model?.addUrl).toBeNull();
  });

  it('derives "+ Add" from the environment Platform link', () => {
    const model = buildEverAppSwitcher('platform=https://app-stage.ever.co,works=https://app-stage.ever.works');

    expect(model?.addUrl).toBe('https://app-stage.ever.co/apps?add=app');
  });
});
