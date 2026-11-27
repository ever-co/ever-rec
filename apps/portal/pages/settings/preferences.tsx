import { FC, ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { Check, ChevronRight } from 'lucide-react';
import Settings from '.';
import SCHeader from 'components/shared/SCHeader/SCHeader';
import { ThemeChoice } from 'components/theme/ThemeProvider';
import LanguageMenu from 'components/shell/LanguageMenu';
import { cn } from 'app/utilities/cn';
import { useDirection } from 'i18n/direction';

// The tiles are pictures of the two themes, so their colours are fixed on purpose: a light tile
// must look light inside the dark theme too.
const PREVIEW = {
  light: {
    window: '#efeff0',
    page: '#fafafb',
    line: '#d9d9de',
    ink: '#18181b',
  },
  dark: { window: '#0a0a0b', page: '#111113', line: '#2a2a2f', ink: '#e4e4e7' },
};

const ThemePreview: FC<{ tone: 'light' | 'dark'; className?: string }> = ({
  tone,
  className,
}) => {
  const c = PREVIEW[tone];

  return (
    <span
      className={cn('tw-flex tw-h-full tw-gap-1 tw-p-1.5', className)}
      style={{ background: c.window }}
      aria-hidden="true"
    >
      <span className="tw-flex tw-w-1/4 tw-flex-col tw-gap-1 tw-pt-1">
        <span
          className="tw-h-1 tw-w-3/4 tw-rounded-full"
          style={{ background: c.ink, opacity: 0.55 }}
        />
        <span
          className="tw-h-1 tw-w-full tw-rounded-full"
          style={{ background: c.line }}
        />
        <span
          className="tw-h-1 tw-w-2/3 tw-rounded-full"
          style={{ background: c.line }}
        />
      </span>
      <span
        className="tw-flex tw-flex-1 tw-flex-col tw-gap-1 tw-rounded tw-p-1.5"
        style={{ background: c.page, boxShadow: `0 0 0 1px ${c.line}` }}
      >
        <span
          className="tw-h-1 tw-w-1/3 tw-rounded-full"
          style={{ background: c.ink, opacity: 0.7 }}
        />
        <span className="tw-mt-0.5 tw-grid tw-flex-1 tw-grid-cols-3 tw-gap-1">
          {[0, 1, 2].map((cell) => (
            <span
              key={cell}
              className="tw-rounded-sm"
              style={{ background: c.line }}
            />
          ))}
        </span>
      </span>
    </span>
  );
};

const Section: FC<{ title: string; hint: string; children: ReactNode }> = ({
  title,
  hint,
  children,
}) => (
  <section className="tw-grid tw-gap-4 tw-border-0 tw-border-t tw-border-solid tw-border-border tw-py-6 first:tw-border-t-0 first:tw-pt-0 md:tw-grid-cols-[14rem_minmax(0,1fr)] md:tw-gap-8">
    <div>
      <h2 className="tw-m-0 tw-text-sm tw-font-medium tw-text-foreground">
        {title}
      </h2>
      <p className="tw-m-0 tw-mt-1 tw-text-[13px] tw-leading-5 tw-text-muted-foreground">
        {hint}
      </p>
    </div>
    <div className="tw-min-w-0">{children}</div>
  </section>
);

const Preferences: FC = () => {
  const { t } = useTranslation();
  const direction = useDirection();
  const { theme, setTheme } = useTheme();
  // The stored theme is only known in the browser.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const choice: ThemeChoice | undefined = mounted
    ? ((theme as ThemeChoice) ?? 'system')
    : undefined;
  const themeTiles: {
    value: ThemeChoice;
    label: string;
    picture: ReactNode;
  }[] = [
    {
      value: 'light',
      label: t('page.appearance.light'),
      picture: <ThemePreview tone="light" />,
    },
    {
      value: 'dark',
      label: t('page.appearance.dark'),
      picture: <ThemePreview tone="dark" />,
    },
    {
      value: 'system',
      label: t('page.appearance.system'),
      picture: (
        <span className="tw-relative tw-block tw-h-full">
          <ThemePreview tone="light" />
          <ThemePreview
            tone="dark"
            className="tw-absolute tw-inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]"
          />
        </span>
      ),
    },
  ];

  return (
    <Settings>
      <SCHeader filterValue={null} />

      <div className="tw-flex-1 tw-overflow-y-auto">
        <div className="tw-mx-auto tw-w-full tw-max-w-3xl tw-px-4 tw-py-8 md:tw-px-8">
          <div className="tw-mb-8">
            <h1 className="tw-m-0 tw-text-2xl tw-font-semibold tw-text-foreground">
              {t('page.preference.preferences')}
            </h1>
            <p className="tw-m-0 tw-mt-1 tw-text-sm tw-text-muted-foreground">
              {t('page.appearance.description')}
            </p>
          </div>

          <Section
            title={t('page.appearance.theme')}
            hint={t('page.appearance.themeHint')}
          >
            <div
              role="radiogroup"
              aria-label={t('page.appearance.theme')}
              className="tw-grid tw-grid-cols-3 tw-gap-3"
              onKeyDown={(event) => {
                // Right to left, the next tile is on the left.
                const forward =
                  direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
                const back = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
                let step = 0;
                if (event.key === forward || event.key === 'ArrowDown') {
                  step = 1;
                } else if (event.key === back || event.key === 'ArrowUp') {
                  step = -1;
                } else {
                  return;
                }

                event.preventDefault();
                const current = Math.max(
                  0,
                  themeTiles.findIndex((tile) => tile.value === choice),
                );
                const next =
                  themeTiles[
                    (current + step + themeTiles.length) % themeTiles.length
                  ];
                setTheme(next.value);
                event.currentTarget
                  .querySelector<HTMLElement>(
                    `[data-theme-choice="${next.value}"]`,
                  )
                  ?.focus();
              }}
            >
              {themeTiles.map((tile, index) => {
                const selected = choice === tile.value;
                // One tab stop for the group: the chosen tile, or the first one before a choice is known.
                const tabStop = choice ? selected : index === 0;

                return (
                  <button
                    key={tile.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={tabStop ? 0 : -1}
                    data-theme-choice={tile.value}
                    onClick={() => setTheme(tile.value)}
                    className={cn(
                      'tw-group tw-flex tw-flex-col tw-gap-2 tw-rounded-lg tw-bg-transparent tw-p-0 tw-text-start tw-outline-none',
                    )}
                  >
                    <span
                      className={cn(
                        'tw-block tw-h-20 tw-w-full tw-overflow-hidden tw-rounded-lg tw-border tw-border-solid tw-transition-shadow tw-duration-150 group-focus-visible:tw-ring-2 group-focus-visible:tw-ring-ring group-focus-visible:tw-ring-offset-2 group-focus-visible:tw-ring-offset-background',
                        selected
                          ? 'tw-border-transparent tw-shadow-[0_0_0_2px_hsl(var(--brand))]'
                          : 'tw-border-border group-hover:tw-border-foreground/30',
                      )}
                    >
                      {tile.picture}
                    </span>
                    <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-text-foreground">
                      <span
                        className={cn(
                          'tw-flex tw-size-4 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-solid',
                          selected
                            ? 'tw-border-transparent tw-bg-primary tw-text-primary-foreground'
                            : 'tw-border-input',
                        )}
                        aria-hidden="true"
                      >
                        {selected && <Check className="tw-size-3" />}
                      </span>
                      {tile.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section
            title={t('common.language')}
            hint={t('page.appearance.languageHint')}
          >
            <LanguageMenu />
          </Section>

          <Section
            title={t('page.appearance.saving')}
            hint={t('page.appearance.savingHint')}
          >
            <Link
              href="/preferences"
              className="tw-flex tw-h-9 tw-w-full tw-max-w-xs tw-items-center tw-justify-between tw-gap-2 tw-rounded-md tw-border tw-border-solid tw-border-input tw-bg-card tw-px-3 tw-text-sm tw-text-foreground tw-outline-none tw-transition-colors tw-duration-150 hover:tw-bg-accent hover:tw-text-foreground focus-visible:tw-ring-2 focus-visible:tw-ring-ring"
            >
              <span className="tw-truncate">
                {t('page.appearance.savingPreferences')}
              </span>
              <ChevronRight
                className="tw-size-4 tw-shrink-0 tw-text-muted-foreground rtl:tw-rotate-180"
                aria-hidden="true"
              />
            </Link>
          </Section>
        </div>
      </div>
    </Settings>
  );
};

export default Preferences;
