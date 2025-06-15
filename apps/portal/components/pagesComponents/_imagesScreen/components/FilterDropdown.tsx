import React, { FC } from 'react';
import classNames from 'classnames';
import { Menu, Dropdown, Button } from 'antd';
import AppSvg from 'components/elements/AppSvg';
import styles from './SortingDropDown.module.scss';
import { IWorkspaceTeam } from 'app/interfaces/IWorkspaceTeams';
import { useTranslation } from 'react-i18next';

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

  const { t } = useTranslation();
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
            <AppSvg path="/common/check-purple.svg" size="19px" />
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
        <span>{t('common.filterByTeam')}</span>
      </Menu.Item>
      <Menu.Item
        className={classNames(styles.itemsStyle)}
        key="remove-filter"
        icon={
          <div
            className="tw-mr-5px"
            style={filterTeamId !== null ? { opacity: 0 } : { opacity: 1 }}
          >
            <AppSvg path="/common/check-purple.svg" size="19px" />
          </div>
        }
      >
        <span>{t('common.noFilter')}</span>
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
        icon={<AppSvg path="/common/team-icon.svg" size="20px" />}
        size="large"
      ></Button>
    </Dropdown>
  );
};

export default FilterDropdown;
