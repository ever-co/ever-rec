/* eslint-disable @next/next/no-img-element */
import { FC, useCallback } from 'react';
import { useRouter } from 'next/router';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, Plus, Settings2 } from 'lucide-react';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import { IUser } from 'app/interfaces/IUserData';
import PanelAC from 'app/store/panel/actions/PanelAC';
import { panelRoutes, preRoutes } from 'components/_routes';
import { cn } from 'app/utilities/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'components/ui/dropdown-menu';
import { initialsOf } from 'components/ui/avatar';

const PRODUCT_NAME = 'Ever Rec';

interface IWorkspaceSwitcherProps {
  collapsed?: boolean;
  onAddWorkspace: () => void;
}

/** The square tile of a workspace: its picture, or its initial on a neutral plate. */
const WorkspaceTile: FC<{
  name: string;
  avatar?: string;
  className?: string;
}> = ({ name, avatar, className }) => (
  <span
    className={cn(
      'tw-flex tw-size-7 tw-shrink-0 tw-items-center tw-justify-center tw-overflow-hidden tw-rounded-md tw-border tw-border-solid tw-border-border tw-bg-card tw-text-xs tw-font-semibold tw-text-foreground',
      className,
    )}
    aria-hidden="true"
  >
    {avatar ? (
      <img src={avatar} alt="" className="tw-size-full tw-object-cover" />
    ) : (
      initialsOf(name).charAt(0)
    )}
  </span>
);

/**
 * The one switcher of the sidebar header (shared shell, A2): the person's own library and the
 * workspaces they belong to, then "Add workspace" and "Manage workspaces".
 *
 * It replaces the old workspace rail; every action of the rail is here.
 */
const WorkspaceSwitcher: FC<IWorkspaceSwitcherProps> = ({
  collapsed = false,
  onAddWorkspace,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch();
  const user: IUser | null = useSelector(
    (state: RootStateOrAny) => state.auth.user,
  );
  const workspaces: IWorkspace[] = useSelector(
    (state: RootStateOrAny) => state.panel.workspaces,
  );
  const activeWorkspace: IWorkspace | null = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );

  const openWorkspace = useCallback(
    (workspace: IWorkspace) => {
      dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: workspace }));
      router.push(`${preRoutes.media}${panelRoutes.workspace}/${workspace.id}`);
    },
    [dispatch, router],
  );

  const openLibrary = useCallback(() => {
    dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: null } as any));
    router.push(preRoutes.media + panelRoutes.images);
  }, [dispatch, router]);

  const libraryName = t('shell.myLibrary');
  const currentName = activeWorkspace?.name ?? libraryName;
  const currentLine = activeWorkspace
    ? t('shell.members', { count: activeWorkspace.members?.length ?? 0 })
    : PRODUCT_NAME;
  const others = workspaces.filter(
    (workspace) => workspace.id !== activeWorkspace?.id,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${t('shell.switchWorkspace')}: ${currentName}`}
          title={collapsed ? currentName : undefined}
          className={cn(
            'tw-flex tw-min-w-0 tw-items-center tw-gap-2 tw-rounded-lg tw-bg-transparent tw-text-left tw-outline-none tw-transition-colors tw-duration-150 hover:tw-bg-sidebar-accent focus-visible:tw-ring-2 focus-visible:tw-ring-ring data-[state=open]:tw-bg-sidebar-accent',
            collapsed
              ? 'tw-size-10 tw-justify-center'
              : 'tw-h-12 tw-flex-1 tw-px-1.5',
          )}
        >
          <WorkspaceTile
            name={activeWorkspace?.name ?? user?.displayName ?? libraryName}
            avatar={activeWorkspace?.avatar}
          />
          {!collapsed && (
            <>
              <span className="tw-flex tw-min-w-0 tw-flex-1 tw-flex-col">
                <span className="tw-truncate tw-text-sm tw-font-semibold tw-leading-5 tw-text-foreground">
                  {currentName}
                </span>
                <span className="tw-truncate tw-text-xs tw-leading-4 tw-text-muted-foreground">
                  {currentLine}
                </span>
              </span>
              <ChevronsUpDown
                className="tw-size-4 tw-shrink-0 tw-text-muted-foreground"
                aria-hidden="true"
              />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side={collapsed ? 'right' : 'bottom'}
        className="tw-w-64"
      >
        <DropdownMenuItem onSelect={openLibrary}>
          <WorkspaceTile
            name={user?.displayName ?? libraryName}
            className="tw-size-6 tw-text-xs"
          />
          <span className="tw-min-w-0 tw-flex-1 tw-truncate">
            {libraryName}
          </span>
          {!activeWorkspace && <Check className="!tw-text-foreground" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('shell.workspaces')}</DropdownMenuLabel>

        {activeWorkspace && (
          <DropdownMenuItem onSelect={() => openWorkspace(activeWorkspace)}>
            <WorkspaceTile
              name={activeWorkspace.name}
              avatar={activeWorkspace.avatar}
              className="tw-size-6 tw-text-xs"
            />
            <span className="tw-min-w-0 tw-flex-1 tw-truncate">
              {activeWorkspace.name}
            </span>
            <Check className="!tw-text-foreground" />
          </DropdownMenuItem>
        )}

        {others.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onSelect={() => openWorkspace(workspace)}
          >
            <WorkspaceTile
              name={workspace.name}
              avatar={workspace.avatar}
              className="tw-size-6 tw-text-xs"
            />
            <span className="tw-min-w-0 tw-flex-1 tw-truncate">
              {workspace.name}
            </span>
          </DropdownMenuItem>
        ))}

        {!others.length && (
          <div className="tw-px-2 tw-py-1.5 tw-text-sm tw-text-muted-foreground">
            {t('shell.noOtherWorkspace')}
          </div>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={onAddWorkspace}>
          <Plus />
          {t('common.addWorkspace')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            router.push(preRoutes.media + panelRoutes.manageWorkspaces)
          }
        >
          <Settings2 />
          {t('common.manageWorkspace')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WorkspaceSwitcher;
