import { FC } from 'react';
import { cn } from 'app/utilities/cn';
import EverStar from './EverStar';

/**
 * The first cell of the sidebar header: the Ever mark, turning slowly (shared shell, A2).
 *
 * Here it is a plain mark. The App Launcher (the shortcut to the other Ever apps) is its own piece
 * of work and makes this mark its button; nothing else in the sidebar depends on this file.
 */
const SidebarBrand: FC<{ className?: string }> = ({ className }) => (
  <span
    aria-hidden="true"
    className={cn(
      'tw-flex tw-size-7 tw-shrink-0 tw-items-center tw-justify-center',
      className,
    )}
  >
    <EverStar className="ever-mark-spin tw-size-5" />
  </span>
);

export default SidebarBrand;
