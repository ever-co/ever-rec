import React, { FC } from 'react';
import { ItemTypeEnum } from '../enums/itemTypeEnum';
import AppSvg from '@/content/components/elements/AppSvg';

interface IProps {
  emptyType?: ItemTypeEnum;
}

const ItemsNotFound: FC<IProps> = ({ emptyType }) => {
  let imagePath = 'images/panel/images/emptyItems/noimage.svg';

  if (emptyType === ItemTypeEnum.videos) {
    imagePath = 'images/panel/images/emptyItems/novideos.svg';
  }

  return (
    <div className="tw-w-full">
      <div className="tw-flex tw-flex-col tw-items-center">
        <AppSvg path={imagePath} className="tw-w-max" />
        <h2 className="tw-text-2xl tw-mt-7 tw-mb-2 tw-font-semibold">
          No items found
        </h2>
        <p className="tw-text-center">
          We couldn&apos;t find any items with your search term.
        </p>
      </div>
    </div>
  );
};

export default ItemsNotFound;
