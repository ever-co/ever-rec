import { FC, ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export const THEME_STORAGE_KEY = 'theme';

export type ThemeChoice = 'light' | 'dark' | 'system';

/**
 * Light / dark / system, the same way the other Ever apps do it.
 *
 * `class="dark"` switches the CSS variables in `styles/tokens.scss`; `data-theme="dark"` is what
 * Tailwind's `tw-dark:` variant matches (a class selector would be prefixed to `.tw-dark`).
 */
const ThemeProvider: FC<{ children: ReactNode }> = ({ children }) => (
  <NextThemesProvider
    attribute={['class', 'data-theme']}
    defaultTheme="system"
    enableSystem
    disableTransitionOnChange
    storageKey={THEME_STORAGE_KEY}
  >
    {children}
  </NextThemesProvider>
);

export default ThemeProvider;
