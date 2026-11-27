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
        key={team.id}
        icon={
          <div
            className={styles.check}
            style={filterTeamId === team.id ? { opacity: 1 } : { opacity: 0 }}
          >
            <AppSvg path="/common/check-purple.svg" size="16px" />
          </div>
        }
      >
        <span>{team.name}</span>
      </Menu.Item>
    );
  });

  const menu = (
    <Menu className={classNames(styles.menu)} onClick={handleMenuClick}>
      <Menu.Item key="fake-item" className={classNames(styles.fakeItem)}>
        <span>{t('common.filterByTeam')}</span>
      </Menu.Item>
      <Menu.Item
        key="remove-filter"
        icon={
          <div
            className={styles.check}
            style={filterTeamId !== null ? { opacity: 0 } : { opacity: 1 }}
          >
            <AppSvg path="/common/check-purple.svg" size="16px" />
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
          marginInlineStart: '.5rem',
          marginTop: '1px',
          padding: '3px !important',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // A team filter is on: the accent ring of a selected control.
          borderColor: filterTeamId ? 'hsl(var(--brand))' : undefined,
          boxShadow: filterTeamId ? '0 0 0 1px hsl(var(--brand))' : undefined,
        }}
        icon={<AppSvg path="/common/team-icon.svg" size="20px" />}
        size="large"
      ></Button>
    </Dropdown>
  );
};

export default FilterDropdown;
