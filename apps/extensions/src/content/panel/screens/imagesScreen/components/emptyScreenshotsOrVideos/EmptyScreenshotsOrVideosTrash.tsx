import React, { FC } from 'react';
import { imagesPath } from '@/app/utilities/common';
import { useTranslation } from 'react-i18next';

const EmptyScreenshotsOrVideosTrash: FC = () => {
  const { t } = useTranslation();
  return (
    <div className="tw-flex tw-flex-col tw-items-center tw-pt-8 tw-h-70vh">
      <img
        src={imagesPath + '/panel/images/notrash.svg'}
        className="tw-w-max"
      />
      <h2 className="tw-text-2xl tw-mt-7 tw-mb-2">{t('shared.noItems')}</h2>
      <p className="tw-text-center">{t('shared.noItemsInTrash')}</p>
    </div>
  );
};

export default EmptyScreenshotsOrVideosTrash;
