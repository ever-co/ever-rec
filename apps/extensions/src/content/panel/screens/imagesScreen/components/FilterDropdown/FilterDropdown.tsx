import React, { FC } from 'react';
import classNames from 'classnames';
import styles from '../sortingDropDown/sortingDropDown.module.scss';
import { Menu, Dropdown, Button } from 'antd';
import { IWorkspaceTeam } from '@/app/interfaces/IWorkspaceTeams';
import AppSvg from '@/content/components/elements/AppSvg';

interface IProps {
  filterTeamId: string | null;
  teams: IWorkspaceTeam[];
  clicked: (teamId: string | null) => void;
}

export const FilterDropdown: FC<IProps> = ({
  filterTeamId,
  teams,
  clicked,
}) => {
  const handleMenuClick = (event: any) => {
    if (event.key === 'fake-item') return;
    if (event.key === 'remove-filter') return clicked(null);

    clicked(event.key);
  };

  const menuElements = teams.map((team) => {
    return (
      <Menu.Item
        className={classNames(styles.itemsStyle)}
        key={team.id}
        icon={
          <div
            className="tw-mr-5px"
            style={filterTeamId === team.id ? { opacity: 1 } : { opacity: 0 }}
          >
            <AppSvg path="/images/panel/common/check-purple.svg" size="19px" />
          </div>
        }
      >
        <span>{team.name}</span>
      </Menu.Item>
    );
  });

  const menu = (
    <Menu
      className={classNames(styles.gradientBackground)}
      onClick={handleMenuClick}
    >
      <Menu.Item
        key="fake-item"
        className={classNames(styles.itemsStyle, styles.fakeItem)}
      >
        <span>Filer by Team:</span>
      </Menu.Item>
      <Menu.Item
        className={classNames(styles.itemsStyle)}
        key="remove-filter"
        icon={
          <div
            className="tw-mr-5px"
            style={filterTeamId !== null ? { opacity: 0 } : { opacity: 1 }}
          >
            <AppSvg path="/images/panel/common/check-purple.svg" size="19px" />
          </div>
        }
      >
        <span>No filter</span>
      </Menu.Item>

      {menuElements}
    </Menu>
  );

  return (
    <Dropdown trigger={['click']} overlay={menu}>
      <Button
        style={{
          marginLeft: '.5rem',
          marginTop: '1px',
          borderRadius: '5px',
          padding: '3px !important',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: filterTeamId ? '2px solid #5c4ebb' : undefined,
        }}
        icon={<AppSvg path="/images/panel/common/team-icon.svg" size="20px" />}
        size="large"
      ></Button>
    </Dropdown>
  );
};

export default FilterDropdown;
