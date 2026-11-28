import { FC } from 'react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';
import { Button } from 'components/ui/button';
import { Hint } from 'components/ui/tooltip';
import useResolvedTheme from 'components/theme/useResolvedTheme';

/**
 * One icon button that switches light and dark (shared shell, A4). The full choice, with
 * "System", is in Preferences.
 */
const ThemeToggle: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation();
  const { setTheme } = useTheme();
  const theme = useResolvedTheme();
  const isDark = theme === 'dark';
  const label = isDark ? t('shell.switchToLight') : t('shell.switchToDark');

  return (
    <Hint label={label}>
      <Button
        variant="ghost"
        size="icon"
        className={className}
        aria-label={label}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
      >
        {/* Before the mount the theme is unknown: an empty box of the icon's size. */}
        {theme === undefined ? (
          <span className="tw-size-4" />
        ) : isDark ? (
          <Sun />
        ) : (
          <Moon />
        )}
      </Button>
    </Hint>
  );
};

export default ThemeToggle;
