import React, { ReactElement } from 'react';
import classNames from 'classnames';
import styles from './SidebarItemsStyles.module.scss';

interface ISidebarMenuItemProps {
  icon: ReactElement;
  title: string;
  active: boolean;
  className?: string;
  onClick?: () => void;
}

const SidebarMenuItem: React.FC<ISidebarMenuItemProps> = React.forwardRef(
  ({ icon, title, active, className = '', onClick }, ref) => {
    return (
      <div
        className={classNames(
          styles.wrapper,
          active && styles.active,
          className,
        )}
        onClick={onClick}
      >
        {active && <div className={styles.activeIndicator} />}

        <div className={styles.contentOuterWrapper}>
          <div
            className={classNames(
              styles.contentWrapper,
              active && styles.active,
            )}
          >
            <div className={styles.icon}>{icon}</div>
            <div className={styles.title}>{title}</div>
          </div>
        </div>
      </div>
    );
  },
);

SidebarMenuItem.displayName = 'SidebarMenuItem';

export default SidebarMenuItem;
