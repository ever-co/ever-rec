import { FC } from 'react';
import { cn } from 'app/utilities/cn';
import EverAppSwitcher from 'components/elements/everApps/EverAppSwitcher';
import EverMark from 'components/elements/everApps/EverMark';
import { EVER_APP_SWITCHER } from 'misc/everApps';

/**
 * The first cell of the sidebar header: the Ever mark, turning slowly (shared shell, A2).
 *
 * Where the deployment links the other Ever apps (`NEXT_PUBLIC_EVER_APP_LINKS`), the mark is the
 * button of the app switcher. Elsewhere it is the plain mark.
 */
const SidebarBrand: FC<{ className?: string }> = ({ className }) => (
  <span
    className={cn(
      'tw-flex tw-size-8 tw-shrink-0 tw-items-center tw-justify-center',
      className,
    )}
  >
    {EVER_APP_SWITCHER ? (
      <EverAppSwitcher model={EVER_APP_SWITCHER} />
    ) : (
      <EverMark />
    )}
  </span>
);

export default SidebarBrand;
