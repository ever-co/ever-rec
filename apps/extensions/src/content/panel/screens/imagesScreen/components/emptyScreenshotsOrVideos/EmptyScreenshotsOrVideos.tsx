import AppSvg from '@/content/components/elements/AppSvg';
import React, { FC } from 'react';
import { ItemTypeEnum } from '../../pages/shared/enums/itemTypeEnum';

interface IProps {
  emptyType?: ItemTypeEnum;
}

const EmptyScreenshotsOrVideos: FC<IProps> = ({ emptyType }) => {
  let heading = 'No shared items';
  let type = 'a video or screenshot';
  let taking = '';
  let imagePath = 'images/panel/images/emptyItems/noshared.svg';

  if (emptyType === ItemTypeEnum.videos) {
    heading = 'No videos';
    type = 'Record';
    taking = 'recording videos';
    imagePath = 'images/panel/images/emptyItems/novideos.svg';
  } else if (emptyType === ItemTypeEnum.images) {
    heading = 'No images';
    type = 'Capture';
    taking = 'taking screenshots now';
    imagePath = 'images/panel/images/emptyItems/noimage.svg';
  }

  return (
    <div className="tw-flex tw-flex-col tw-items-center">
      <AppSvg path={imagePath} className="tw-w-max" />
      <h2 className="tw-text-2xl tw-mt-7 tw-mb-2 tw-font-semibold">{heading}</h2>
      <p className="tw-text-center">
      {type == 'a video or screenshot' ?
          `The items you have created and shared with others `
           : 
          
          <>Start {taking}. Click the <b>{type}</b> button</>}
          
        <br />
        {type == 'a video or screenshot' ?
         `will be displayed here.`
         :
         `in the extension’s popup menu.`
        } 
      </p>
    </div>
  );
};

export default EmptyScreenshotsOrVideos;
