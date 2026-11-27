import { FC } from 'react';
import { useRouter } from 'next/router';
import { RootStateOrAny, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  ChevronsUpDown,
  CircleHelp,
  LogOut,
  Puzzle,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import { IUser } from 'app/interfaces/IUserData';
import { infoMessage } from 'app/services/helpers/toastMessages';
import { panelRoutes, preRoutes } from 'components/_routes';
import { cn } from 'app/utilities/cn';
import useSignOut from 'hooks/useSignOut';
import { inlineEndSide, useDirection } from 'i18n/direction';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  initialsOf,
} from 'components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'components/ui/dropdown-menu';

/**
 * The person's block at the foot of the sidebar (shared shell, A6). Its menu opens upwards:
 * Account, Preferences, Help, the product's extras, then Sign out.
 */
const UserBlock: FC<{ collapsed?: boolean }> = ({ collapsed = false }) => {
  const { t } = useTranslation();
  const outward = inlineEndSide(useDirection());
  const router = useRouter();
  const signOut = useSignOut();
  const user: IUser | null = useSelector(
    (state: RootStateOrAny) => state.auth.user,
  );

  const name = user?.displayName || t('common.user');
  const email = user?.email ?? '';

  const identity = (
    <>
      <Avatar className="tw-size-8">
        {user?.photoURL && <AvatarImage src={user.photoURL} alt="" />}
        <AvatarFallback>
          {initialsOf(user?.displayName || email)}
        </AvatarFallback>
      </Avatar>
      <span className="tw-flex tw-min-w-0 tw-flex-1 tw-flex-col">
        <span className="tw-truncate tw-text-sm tw-font-medium tw-leading-5 tw-text-foreground">
          {name}
        </span>
        {email && (
          <span className="tw-truncate tw-text-xs tw-leading-4 tw-text-muted-foreground">
            {email}
          </span>
        )}
      </span>
    </>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${t('shell.accountMenu')}: ${name}`}
          title={collapsed ? name : undefined}
          className={cn(
            'tw-flex tw-w-full tw-min-w-0 tw-items-center tw-gap-2 tw-rounded-lg tw-bg-transparent tw-text-start tw-outline-none tw-transition-colors tw-duration-150 hover:tw-bg-sidebar-accent focus-visible:tw-ring-2 focus-visible:tw-ring-ring data-[state=open]:tw-bg-sidebar-accent',
            collapsed ? 'tw-size-10 tw-justify-center' : 'tw-h-12 tw-px-2',
          )}
        >
          {collapsed ? (
            <Avatar className="tw-size-8">
              {user?.photoURL && <AvatarImage src={user.photoURL} alt="" />}
              <AvatarFallback>
                {initialsOf(user?.displayName || email)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <>
              {identity}
              <ChevronsUpDown
                className="tw-size-4 tw-shrink-0 tw-text-muted-foreground"
                aria-hidden="true"
              />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={collapsed ? outward : 'top'}
        align={collapsed ? 'end' : 'start'}
        className="tw-w-64"
      >
        <DropdownMenuLabel className="tw-flex tw-items-center tw-gap-2 tw-py-2">
          {identity}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() => router.push(preRoutes.settings + panelRoutes.profile)}
        >
          <UserRound />
          {t('shell.account')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            router.push(preRoutes.settings + panelRoutes.preferences)
          }
        >
          <SlidersHorizontal />
          {t('page.preference.preferences')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => infoMessage(t('header.helpSoon'))}>
          <CircleHelp />
          {t('header.help')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => infoMessage(t('header.user.availableSoon'))}
        >
          <Puzzle />
          {t('header.user.installChrome')}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={signOut}>
          <LogOut className="rtl:-tw-scale-x-100" />
          {t('header.user.signout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserBlock;
