import React, { ReactElement, ReactNode } from 'react';
import { cn } from 'app/utilities/cn';

interface ISidebarMenuItemProps {
  icon: ReactElement;
  title: string;
  active: boolean;
  /** Icons only (the sidebar is collapsed): the title becomes the tooltip. */
  collapsed?: boolean;
  /** A control at the end of the row, e.g. the chevron that opens the starred folders. */
  trailing?: ReactNode;
  className?: string;
  onClick?: () => void;
}

/** A row of the sidebar navigation: one icon column, one label, the same height everywhere. */
const SidebarMenuItem: React.FC<ISidebarMenuItemProps> = React.memo(
  ({
    icon,
    title,
    active,
    collapsed = false,
    trailing,
    className,
    onClick,
  }) => (
    <span
      onClick={onClick}
      title={collapsed ? title : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'tw-group tw-relative tw-flex tw-h-9 tw-cursor-pointer tw-select-none tw-items-center tw-gap-2.5 tw-rounded-lg tw-text-sm tw-transition-colors tw-duration-150',
        collapsed ? 'tw-w-10 tw-justify-center' : 'tw-w-full tw-px-2.5',
        active
          ? 'tw-bg-sidebar-accent tw-font-medium tw-text-sidebar-accent-foreground'
          : 'tw-text-sidebar-foreground hover:tw-bg-sidebar-accent hover:tw-text-sidebar-accent-foreground',
        className,
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
      {!collapsed && (
        <span className="tw-min-w-0 tw-flex-1 tw-truncate">{title}</span>
      )}
      {!collapsed && trailing}
      {collapsed && <span className="tw-sr-only">{title}</span>}
    </span>
  ),
);

SidebarMenuItem.displayName = 'SidebarMenuItem';

export default SidebarMenuItem;
