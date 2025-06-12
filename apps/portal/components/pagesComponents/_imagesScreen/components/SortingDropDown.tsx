import React from 'react';
import { Menu, Dropdown, Button } from 'antd';
import { ItemOrderEnum } from 'app/enums/itemOrderEnum';
import AppSvg from 'components/elements/AppSvg';
import styles from './SortingDropDown.module.scss';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';

enum SortEnum {
  date = 'date',
  name = 'name',
}

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
  const { t } = useTranslation();
  const handleMenuClick = (event) => {
    const key: SortEnum = event.key;

    if (key === SortEnum.date) {
      sortByDate();
    } else if (key === SortEnum.name) {
      sortByName();
    }
  };

  let sortingTypeString = "newest";
  if (sortingType === ItemOrderEnum.dateOldest) {
    sortingTypeString = "oldest";
  }

  const menu = (
    <Menu
      className={classNames(styles.gradientBackground)}
      onClick={handleMenuClick}
    >
      <Menu.Item
        className={classNames(styles.itemsStyle)}
        key={SortEnum.date}
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
            <AppSvg path="/common/check-purple.svg" size="19px" />
          </div>
        }
      >
        <span>
          {t('common.date')}- {sortingTypeString}
        </span>
      </Menu.Item>
      <Menu.Item
        className={classNames(styles.itemsStyle)}
        key={SortEnum.name}
        icon={
          <div
            className="tw-mr-5px"
            style={
              sortingType !== ItemOrderEnum.name
                ? { opacity: 0 }
                : { opacity: 1 }
            }
          >
            <AppSvg path="/common/check-purple.svg" size="19px" />
          </div>
        }
      >
        <span>{t('common.name')}</span>
      </Menu.Item>
    </Menu>
  );

  return (
    <Dropdown trigger={['click']} overlay={menu} placement="bottom">
      <div className={styles.sortText}>
        <span>{t('common.sort')}:</span>
        <span>{sortingType}</span>
        <AppSvg path="/new-design-v2/down-caret.svg" />
      </div>
    </Dropdown>
  );
};

export default SortingDropDown;
