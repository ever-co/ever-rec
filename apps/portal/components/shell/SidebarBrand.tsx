import { FC } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { cn } from 'app/utilities/cn';
import { panelRoutes, preRoutes } from 'components/_routes';
import EverAppSwitcher from 'components/elements/everApps/EverAppSwitcher';
import EverMark from 'components/elements/everApps/EverMark';
import { EVER_APP_SWITCHER } from 'misc/everApps';

/**
 * The first cell of the sidebar header: the Ever mark, turning slowly (shared shell, A2).
 *
 * Where the deployment links the other Ever apps (`NEXT_PUBLIC_EVER_APP_LINKS`), the mark is the
 * button of the app switcher. Elsewhere it leads to the library, as the logo always did.
 */
const SidebarBrand: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        'tw-flex tw-size-8 tw-shrink-0 tw-items-center tw-justify-center',
        className,
      )}
    >
      {EVER_APP_SWITCHER ? (
        <EverAppSwitcher model={EVER_APP_SWITCHER} />
      ) : (
        <Link
          href={preRoutes.media + panelRoutes.images}
          aria-label={t('shell.myLibrary')}
          className="tw-flex tw-rounded-md tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-ring"
        >
          <EverMark />
        </Link>
      )}
    </span>
  );
};

export default SidebarBrand;
