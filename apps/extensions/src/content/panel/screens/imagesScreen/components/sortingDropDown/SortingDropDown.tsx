import React from 'react';
import { Button, Dropdown, Menu } from 'antd';
import { ItemOrderEnum } from '../../pages/shared/enums/itemOrderEnum';
import AppSvg from '@/content/components/elements/AppSvg';
//@ts-ignore
import * as styles from './sortingDropDown.module.scss';
import classNames from 'classnames';

interface SortingDropDown {
  sortByDate: () => void;
  sortByName: () => void;
  sortingType?: ItemOrderEnum;
}

const SortingDropDown: React.FC<SortingDropDown> = ({
  sortByDate,
  sortingType,
  sortByName,
}) => {
  let sortingTypeString = 'newest';
  if (sortingType === ItemOrderEnum.dateOldest) {
    sortingTypeString = 'oldest';
  }

  const menu = (
    <Menu className={classNames(styles.gradientBackground)}>
      <Menu.Item
        className={classNames(styles.itemsStyle)}
        key={1}
        onClick={() => {
          sortByDate();
        }}
        icon={
          <div
            className="tw-mr-5px"
            style={
              sortingType === ItemOrderEnum.dateNewest ||
              sortingType === ItemOrderEnum.dateOldest
                ? { opacity: 1 }
                : { opacity: 0 }
            }
          >
            <AppSvg path="images/panel/common/check-purple.svg" size="19px" />
          </div>
        }
      >
        Date - {sortingTypeString}
      </Menu.Item>
      <Menu.Item
        className={classNames(styles.itemsStyle)}
        key={2}
        onClick={() => {
          sortByName();
        }}
        icon={
          <div
            className="tw-mr-5px"
            style={
              sortingType !== ItemOrderEnum.name
                ? { opacity: 0 }
                : { opacity: 1 }
            }
          >
            <AppSvg path="images/panel/common/check-purple.svg" size="19px" />
          </div>
        }
      >
        Name
      </Menu.Item>
    </Menu>
  );

  return (
    <Dropdown trigger={['click']} overlay={menu}>
      {/* <Button
        style={{
          marginTop: '1px',
          borderRadius: '5px',
          padding: '3px !important',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        icon={
          <AppSvg path="images/panel/common/sort-svgrepo-com.svg" size="20px" />
        }
        size="large"
      ></Button> */}
      <div className={styles.sortText}>
        <span>Sort:</span>
        <span>{sortingType}</span>
        <AppSvg path="images/new-design-v2/down-caret.svg" />
      </div>
    </Dropdown>
  );
};

export default SortingDropDown;
