import React, { ReactElement, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from 'app/utilities/cn';

interface ISidebarMenuItemProps {
  href: string;
  icon: ReactElement;
  title: string;
  active: boolean;
  /** Icons only (the sidebar is collapsed): the title becomes the tooltip. */
  collapsed?: boolean;
  /** A control at the end of the row, e.g. the chevron that opens the starred folders. */
  trailing?: ReactNode;
  className?: string;
  /** Runs when the link is followed, by a click or from the keyboard. */
  onClick?: () => void;
}

/**
 * A row of the sidebar navigation: one icon column, one label, the same height everywhere.
 *
 * The row is the link itself, so it is one tab stop and Enter follows it. A trailing control sits
 * beside the link, not inside it.
 */
const SidebarMenuItem: React.FC<ISidebarMenuItemProps> = React.memo(
  ({
    href,
    icon,
    title,
    active,
    collapsed = false,
    trailing,
    className,
    onClick,
  }) => (
    <div
      className={cn(
        'tw-group tw-relative tw-flex tw-h-9 tw-select-none tw-items-center tw-rounded-lg tw-text-sm tw-transition-colors tw-duration-150',
        collapsed ? 'tw-w-10' : 'tw-w-full',
        active
          ? 'tw-bg-sidebar-accent tw-font-medium tw-text-sidebar-accent-foreground'
          : 'tw-text-sidebar-foreground hover:tw-bg-sidebar-accent hover:tw-text-sidebar-accent-foreground',
        className,
      )}
    >
      <Link
        href={href}
        onClick={onClick}
        title={collapsed ? title : undefined}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'tw-flex tw-h-full tw-min-w-0 tw-flex-1 tw-items-center tw-gap-2.5 tw-rounded-lg tw-text-inherit tw-outline-none hover:tw-text-inherit focus-visible:tw-ring-2 focus-visible:tw-ring-ring',
          collapsed ? 'tw-justify-center' : 'tw-px-2.5',
        )}
      >
        <span
          className={cn(
            'tw-flex tw-size-[18px] tw-shrink-0 tw-items-center tw-justify-center [&_svg]:tw-size-[18px] [&_svg]:tw-stroke-[1.75]',
            active
              ? 'tw-text-sidebar-accent-foreground'
              : 'tw-text-muted-foreground group-hover:tw-text-sidebar-accent-foreground',
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
        {collapsed ? (
          <span className="tw-sr-only">{title}</span>
        ) : (
          <span className="tw-min-w-0 tw-flex-1 tw-truncate">{title}</span>
        )}
      </Link>
      {!collapsed && trailing}
    </div>
  ),
);

SidebarMenuItem.displayName = 'SidebarMenuItem';

export default SidebarMenuItem;
