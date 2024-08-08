import React, { FC } from 'react';
import { imagesPath } from '@/app/utilities/common';

const EmptyScreenshotsOrVideosTrash: FC = () => {
  return (
    <div className="tw-flex tw-flex-col tw-items-center tw-pt-8 tw-h-70vh">
      <img
        src={imagesPath + '/panel/images/notrash.svg'}
        className="tw-w-max"
      />
      <h2 className="tw-text-2xl tw-mt-7 tw-mb-2">No items</h2>
      <p className="tw-text-center">
          You haven’t sent any items to temporary storage for deletion yet.
      </p>
    </div>
  );
};

export default EmptyScreenshotsOrVideosTrash;
