import { FC, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootStateOrAny } from 'react-redux';
import { useRouter } from 'next/router';
import Image from 'next/legacy/image';
import Link from 'next/link';
import classNames from 'classnames';
import { Tooltip } from 'antd';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import PanelAC from 'app/store/panel/actions/PanelAC';
import { panelRoutes, preRoutes } from 'components/_routes';
import AppSvg from 'components/elements/AppSvg';
import styles from './SidebarWorkspaces.module.scss';

interface SidebarWorkspacesProps {
  addNewWorkspaceClicked: () => void;
}

const SidebarWorkspaces: FC<SidebarWorkspacesProps> = ({
  addNewWorkspaceClicked,
}) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const workspaces: IWorkspace[] = useSelector(
    (state: RootStateOrAny) => state.panel.workspaces,
  );
  const activeWorkspace = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );

  const changeActiveWorkspace = useCallback(
    (activeWorkspace: IWorkspace) => {
      dispatch(PanelAC.setActiveWorkspace({ activeWorkspace }));

      router.push(
        `${preRoutes.media}${panelRoutes.workspace}/${activeWorkspace.id}`,
      );
    },
    [dispatch, router],
  );

  const workspaceItems = useMemo(
    () =>
      workspaces.map((workspace) => {
        const isActive = workspace.id === activeWorkspace?.id;
        const onClick = () => changeActiveWorkspace(workspace);

        return (
          <Tooltip key={workspace.id} title={workspace.name} placement="right">
            <div>
              {workspace?.avatar ? (
                <SidebarWorkspacesImageComponent
                  avatarSrc={workspace.avatar}
                  isActive={isActive}
                  clicked={onClick}
                />
              ) : (
                <SidebarWorkspacesDefaultItem
                  workspaceName={workspace.name}
                  isActive={isActive}
                  clicked={onClick}
                />
              )}
            </div>
          </Tooltip>
        );
      }),
    [workspaces, activeWorkspace, changeActiveWorkspace],
  );

  return (
    <div className={`${styles.sidebarWorkspaces} tw-py-10 tw-px-2`}>
      <h4 className='tw-text-xs tw-text-center tw-font-semibold tw-mb-2'>Works</h4>
      <div className={classNames(styles.workspaceItems, 'scroll-div')}>
        {workspaceItems}
        {!workspaceItems.length && (
          <AddWorkspaceButton onClick={addNewWorkspaceClicked} />
        )}
      </div>

      {workspaceItems.length > 0 && (
        <AddWorkspaceButton onClick={addNewWorkspaceClicked} />
      )}
      <ManageWorkspacesButton />
    </div>
  );
};

export default SidebarWorkspaces;

interface SidebarWorkspacesImageComponentProps {
  avatarSrc: string;
  isActive: boolean;
  clicked: () => void;
}

const SidebarWorkspacesImageComponent: FC<
  SidebarWorkspacesImageComponentProps
> = ({ avatarSrc, isActive, clicked }) => {
  return (
    <div
      className={classNames(styles.itemWrapper, isActive && styles.active)}
      onClick={clicked}
    >
      <div className={styles.imgWrapper}>
        <Image src={avatarSrc} alt="" layout="fill" objectFit="fill" />
      </div>
    </div>
  );
};

interface SidebarWorkspacesDefaultItemProps {
  workspaceName: string;
  isActive: boolean;
  clicked: () => void;
}

const SidebarWorkspacesDefaultItem: FC<SidebarWorkspacesDefaultItemProps> = ({
  workspaceName,
  isActive,
  clicked,
}) => {
  return (
    <div
      className={classNames(styles.itemWrapper, isActive && styles.active)}
      onClick={clicked}
    >
      <div className={styles.defaultItemWrapper}>
        <span className={styles.defaultItemLetter}>
          {workspaceName.charAt(0).toUpperCase()}
        </span>
      </div>
    </div>
  );
};

const AddWorkspaceButton: FC<{ onClick: () => void }> = ({ onClick }) => (
  <div onClick={onClick}>
    <Tooltip title="Add workspace" placement="right">
      <div>
        <AppSvg
          path="/common/add-workspace.svg"
          size="25px"
          className={classNames(styles.addItemWrapper, styles.addNewWorkspace)}
          bgColor="black"
        />
      </div>
    </Tooltip>
  </div>
);

const ManageWorkspacesButton: FC = () => (
  <Link href={preRoutes.media + panelRoutes.manageWorkspaces} passHref>
    <Tooltip title="Manage workspaces" placement="right">
      <div>
        <AppSvg
          className={classNames(styles.itemWrapper, styles.addNewWorkspace)}
          path="/common/icon-Manage-light.svg"
          size="20px"
        />
      </div>
    </Tooltip>
  </Link>
);
