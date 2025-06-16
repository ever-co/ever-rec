import React, { FC } from 'react';
import AppSvg from 'components/elements/AppSvg';
import { ItemTypeEnum } from 'app/enums/itemTypeEnum';
import { useTranslation } from 'react-i18next';

interface IProps {
  emptyType?: ItemTypeEnum;
}

const ItemsNotFound: FC<IProps> = ({ emptyType }) => {
  const { t } = useTranslation();
  let imagePath = '/images/emptyItems/noimage.svg';

  if (emptyType === ItemTypeEnum.videos) {
    imagePath = '/images/emptyItems/novideos.svg';
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
