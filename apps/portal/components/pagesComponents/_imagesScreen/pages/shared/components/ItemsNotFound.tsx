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
      <div className="tw-flex tw-flex-col tw-items-center tw-px-6 tw-py-10">
        <AppSvg path={imagePath} className="tw-w-max" />
        <h2 className="tw-text-lg tw-mt-6 tw-mb-1 tw-font-semibold tw-text-foreground">
          {t('shared.noItemsFound')}
        </h2>
        <p className="tw-text-center tw-text-sm tw-text-muted-foreground">
          {t('shared.noItemsWithSearchTerm')}
        </p>
      </div>
    </div>
  );
};

export default ItemsNotFound;
