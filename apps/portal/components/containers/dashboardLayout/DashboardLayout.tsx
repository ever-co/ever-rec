import { FC, ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar/Sidebar';
import { useShell } from 'components/shell/ShellContext';
import { cn } from 'app/utilities/cn';

interface IProps {
  children?: ReactNode;
  isProfilePage?: boolean;
  isWorkspaceSettingsPage?: boolean;
  /**
   * The assistant panel (shared Ever shell, A7): it sits between the sidebar and the page.
   * Nothing serves an assistant in Ever Rec yet, so no page passes one; the layout is ready for it.
   */
  assistant?: ReactNode;
}

/**
 * The shared Ever app shell (A1): a full-height sidebar on the window colour, and the page in a
 * panel beside it. On phones the sidebar is a drawer, opened from the page's top bar.
 */
const DashboardLayout: FC<IProps> = ({
  children,
  isProfilePage = false,
  isWorkspaceSettingsPage = false,
  assistant,
}) => {
  const { t } = useTranslation();
  const { drawerOpen, setDrawerOpen } = useShell();

  // Escape closes the drawer; the page behind it does not scroll while it is open.
  useEffect(() => {
    if (!drawerOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, setDrawerOpen]);

  return (
    <div className="tw-flex tw-h-[100dvh] tw-w-full tw-overflow-hidden tw-bg-sidebar tw-text-foreground">
      {/* Desktop sidebar */}
      <div className="tw-hidden tw-h-full tw-shrink-0 md:tw-block">
        <Sidebar
          isProfilePage={isProfilePage}
          isWorkspaceSettingsPage={isWorkspaceSettingsPage}
        />
      </div>

      {/* Phone drawer */}
      <div
        className={cn(
          'tw-fixed tw-inset-0 tw-z-[900] md:tw-hidden',
          drawerOpen ? 'tw-visible' : 'tw-invisible',
        )}
        aria-hidden={!drawerOpen}
      >
        <div
          className={cn(
            'tw-absolute tw-inset-0 tw-bg-[hsl(var(--overlay)/var(--overlay-opacity))] tw-transition-opacity tw-duration-200',
            drawerOpen ? 'tw-opacity-100' : 'tw-opacity-0',
          )}
          onClick={() => setDrawerOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('shell.openNavigation')}
          className={cn(
            'tw-absolute tw-inset-y-0 tw-left-0 tw-flex tw-w-[18rem] tw-max-w-[85vw] tw-border-0 tw-border-r tw-border-solid tw-border-sidebar-border tw-bg-sidebar tw-transition-transform tw-duration-200 tw-ease-out rtl:tw-left-auto rtl:tw-right-0',
            drawerOpen
              ? 'tw-translate-x-0'
              : '-tw-translate-x-full rtl:tw-translate-x-full',
          )}
        >
          {drawerOpen && (
            <Sidebar
              inDrawer
              onCloseDrawer={() => setDrawerOpen(false)}
              isProfilePage={isProfilePage}
              isWorkspaceSettingsPage={isWorkspaceSettingsPage}
            />
          )}
        </div>
      </div>

      {assistant}

      {/* The page panel */}
      <div className="tw-relative tw-flex tw-min-w-0 tw-flex-1 tw-flex-col tw-overflow-hidden tw-bg-background md:tw-my-2 md:tw-mr-2 md:tw-rounded-xl md:tw-shadow-[0_0_0_1px_hsl(var(--border)),var(--shadow-sm)]">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;
