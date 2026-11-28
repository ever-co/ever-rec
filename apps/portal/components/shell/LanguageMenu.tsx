import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronsUpDown, Languages } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from 'components/ui/dropdown-menu';
import { cn } from 'app/utilities/cn';
import { languages } from '../../i18n/constants';

interface ILanguageMenuProps {
  /**
   * `field`: a full-width select, for Preferences.
   * `compact`: a small button for the corner of the signed-out pages.
   */
  variant?: 'field' | 'compact';
  className?: string;
}

/** The language choice: every language under its own name, the current one checked. */
const LanguageMenu: FC<ILanguageMenuProps> = ({
  variant = 'field',
  className,
}) => {
  const { t, i18n } = useTranslation();
  const current =
    languages.find((language) => language.code === i18n.resolvedLanguage) ??
    languages.find((language) => language.code === i18n.language) ??
    languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${t('common.language')}: ${current.nativeName}`}
          className={cn(
            'tw-flex tw-items-center tw-gap-2 tw-rounded-md tw-border tw-border-solid tw-border-input tw-text-sm tw-text-foreground tw-outline-none tw-transition-colors tw-duration-150 hover:tw-bg-accent focus-visible:tw-ring-2 focus-visible:tw-ring-ring',
            variant === 'field'
              ? 'tw-h-9 tw-w-full tw-max-w-xs tw-justify-between tw-bg-card tw-px-3'
              : 'tw-h-8 tw-bg-transparent tw-px-2.5',
            className,
          )}
        >
          {variant === 'compact' && (
            <Languages
              className="tw-size-4 tw-shrink-0 tw-text-muted-foreground"
              aria-hidden="true"
            />
          )}
          <span className="tw-truncate">{current.nativeName}</span>
          <ChevronsUpDown
            className="tw-size-4 tw-shrink-0 tw-text-muted-foreground"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn(
          'tw-max-h-80 tw-overflow-y-auto',
          variant === 'field'
            ? 'tw-w-[var(--radix-dropdown-menu-trigger-width)]'
            : 'tw-w-56',
        )}
      >
        <DropdownMenuRadioGroup
          value={current.code}
          onValueChange={(code) => i18n.changeLanguage(code)}
        >
          {languages.map((language) => (
            <DropdownMenuRadioItem
              key={language.code}
              value={language.code}
              lang={language.code}
            >
              <span className="tw-truncate">{language.nativeName}</span>
              {language.nativeName !== language.text && (
                <span className="tw-truncate tw-text-xs tw-text-muted-foreground">
                  {language.text}
                </span>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageMenu;
