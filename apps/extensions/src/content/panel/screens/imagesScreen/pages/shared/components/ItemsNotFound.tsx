import React, { FC } from 'react';
import { ItemTypeEnum } from '../enums/itemTypeEnum';
import AppSvg from '@/content/components/elements/AppSvg';
import { useTranslation } from 'react-i18next';

interface IProps {
  emptyType?: ItemTypeEnum;
}

const ItemsNotFound: FC<IProps> = ({ emptyType }) => {
  const { t } = useTranslation();
  let imagePath = 'images/panel/images/emptyItems/noimage.svg';

  if (emptyType === ItemTypeEnum.videos) {
    imagePath = 'images/panel/images/emptyItems/novideos.svg';
  }

  return (
    <div className="tw-w-full">
      <div className="tw-flex tw-flex-col tw-items-center">
        <AppSvg path={imagePath} className="tw-w-max" />
        <h2 className="tw-text-2xl tw-mt-7 tw-mb-2 tw-font-semibold">
          {t('shared.noItemsFound')}
        </h2>
        <p className="tw-text-center">{t('shared.noItemsWithSearchTerm')}</p>
      </div>
    </div>
  );
};

export default ItemsNotFound;
