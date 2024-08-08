import AppSvg from 'components/elements/AppSvg';
import React, { FC } from 'react';

const EmptyScreenshotsOrVideosTrash: FC = () => {
  return (
    <div className="tw-flex tw-flex-col tw-items-center tw-pt-8 tw-h-70vh">
      <AppSvg path="/images/emptyItems/notrash.svg" className="tw-w-max" />
      <h2 className="tw-text-2xl tw-mt-7 tw-mb-2 tw-font-semibold">
        No items
      </h2>
      <p className="tw-text-center">
         You haven’t sent any items to temporary storage for deletion yet.
      </p>
    </div>
  );
};

export default EmptyScreenshotsOrVideosTrash;
