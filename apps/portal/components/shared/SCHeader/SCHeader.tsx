import { FC, ChangeEvent, useRef } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  CircleHelp,
  Menu as MenuIcon,
  Search,
  Settings,
  UserPlus,
} from 'lucide-react';
import { panelRoutes, preRoutes } from 'components/_routes';
import { infoMessage } from 'app/services/helpers/toastMessages';
import { Button } from 'components/ui/button';
import { Hint } from 'components/ui/tooltip';
import ThemeToggle from 'components/shell/ThemeToggle';
import { useShell } from 'components/shell/ShellContext';

interface ISCHeaderProps {
  filterValue?: string | null;
  showSearch?: boolean;
  text?: string;
  /** No longer drawn here: the person's picture is in the block at the foot of the sidebar. */
  userPhotoURL?: string | null;
  isWorkspace?: boolean;
  isWorkspaceAdmin?: boolean;
  onFilterChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onInviteMembersButtonClick?: () => void;
}

/**
 * The top bar of a page (shared Ever shell, A1): the search (or a title the page asks for) on the left;
 * the product's controls, notifications, help and the one theme icon on the right. The person's
 * menu and the language choice live in the sidebar's user block and in Preferences.
 */
const SCHeader: FC<ISCHeaderProps> = ({
  filterValue,
  text,
  showSearch = true,
  isWorkspace = false,
  isWorkspaceAdmin = false,
  onFilterChange,
  onInviteMembersButtonClick,
}) => {
  const { t } = useTranslation();
  const clickedNotifications = useRef(false); // to be removed when implemented
  const clickedHelpCenter = useRef(false); // to be removed when implemented
  const router = useRouter();
  const { setDrawerOpen } = useShell();

  const goToWorkspace = () => {
    const { workspaceId } = router.query;

    router.push(
      preRoutes.media + panelRoutes.getWorkspaceSettings(workspaceId as string),
    );
  };

  // A page that has nothing to search (`filterValue === null`) shows no disabled field; its own
  // heading names it. A caller can still ask for a title here with `text`.
  const canSearch = showSearch && filterValue !== null;
  const title = canSearch ? undefined : text;

  return (
    <header className="tw-flex tw-h-14 tw-shrink-0 tw-items-center tw-justify-between tw-gap-3 tw-border-0 tw-border-b tw-border-solid tw-border-border tw-px-4 md:tw-px-6">
      <div className="tw-flex tw-min-w-0 tw-flex-1 tw-items-center tw-gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="-tw-ml-1 md:tw-hidden"
          aria-label={t('shell.openNavigation')}
          onClick={() => setDrawerOpen(true)}
        >
          <MenuIcon />
        </Button>

        {canSearch ? (
          <label className="tw-flex tw-h-8 tw-w-full tw-max-w-sm tw-items-center tw-gap-2 tw-rounded-md tw-border tw-border-solid tw-border-border tw-bg-card tw-px-2.5 tw-text-sm tw-text-muted-foreground tw-transition-colors tw-duration-150 focus-within:tw-border-ring focus-within:tw-ring-2 focus-within:tw-ring-ring/20">
            <Search className="tw-size-4 tw-shrink-0" aria-hidden="true" />
            <input
              value={filterValue ?? ''}
              type="search"
              placeholder={t('header.searchFiles')}
              aria-label={t('header.searchFiles')}
              className="tw-min-w-0 tw-flex-1 tw-bg-transparent tw-text-sm tw-text-foreground tw-outline-none [&::-webkit-search-cancel-button]:tw-appearance-none"
              onChange={onFilterChange}
            />
          </label>
        ) : (
          title && (
            <h1 className="tw-truncate tw-text-base tw-font-semibold tw-text-foreground">
              {title}
            </h1>
          )
        )}
      </div>

      <div className="tw-flex tw-shrink-0 tw-items-center tw-gap-1">
        {isWorkspace && (
          <>
            <Button
              size="sm"
              className="tw-mr-1 tw-hidden sm:tw-inline-flex"
              onClick={onInviteMembersButtonClick}
            >
              <UserPlus />
              {t('workspace.inviteTeammates')}
            </Button>
            <Hint label={t('workspace.inviteTeammates')}>
              <Button
                variant="ghost"
                size="icon-sm"
                className="sm:tw-hidden"
                aria-label={t('workspace.inviteTeammates')}
                onClick={onInviteMembersButtonClick}
              >
                <UserPlus />
              </Button>
            </Hint>

            {isWorkspaceAdmin && (
              <Hint label={t('header.companySettings')}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('header.companySettings')}
                  onClick={goToWorkspace}
                >
                  <Settings />
                </Button>
              </Hint>
            )}
          </>
        )}

        <Hint label={t('header.notifications')}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('header.notifications')}
            onClick={() => {
              clickedNotifications.current === false &&
                infoMessage(t('header.notificationsSoon'));

              clickedNotifications.current = true;
            }}
          >
            <Bell />
          </Button>
        </Hint>

        <Hint label={t('header.help')}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('header.help')}
            onClick={() => {
              clickedHelpCenter.current === false &&
                infoMessage(t('header.helpSoon'));

              clickedHelpCenter.current = true;
            }}
          >
            <CircleHelp />
          </Button>
        </Hint>

        <ThemeToggle className="tw-size-8" />
      </div>
    </header>
  );
};

export default SCHeader;
