import AppSvg from 'components/elements/AppSvg';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';

const EmptyScreenshotsOrVideosTrash: FC = () => {
  const { t } = useTranslation();
  return (
    <div className="tw-flex tw-flex-col tw-items-center tw-px-6 tw-py-10">
      <AppSvg path="/images/emptyItems/notrash.svg" className="tw-w-max" />
      <h2 className="tw-text-lg tw-mt-6 tw-mb-1 tw-font-semibold tw-text-foreground">
        {t('shared.noItems')}
      </h2>
      <p className="tw-text-center tw-text-sm tw-text-muted-foreground">
        {t('shared.noItemsInTrash')}
      </p>
    </div>
  );
};

export default EmptyScreenshotsOrVideosTrash;
