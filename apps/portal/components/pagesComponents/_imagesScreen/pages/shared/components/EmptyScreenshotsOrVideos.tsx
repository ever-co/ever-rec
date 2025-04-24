import React, { FC } from 'react';
import { ItemTypeEnum } from 'app/enums/itemTypeEnum';
import AppSvg from 'components/elements/AppSvg';
import { Trans, useTranslation } from 'react-i18next';

interface IProps {
  emptyType?: ItemTypeEnum;
}

const EmptyScreenshotsOrVideos: FC<IProps> = ({ emptyType }) => {
  const { t } = useTranslation();
  let heading = t('shared.noSharedItems');
  let type = 'a video or screenshot';
  let typeTranslated = t('shared.videoOrTranslationVideo');
  let taking = '';
  let imagePath = '/images/emptyItems/noshared.svg';

  if (emptyType === ItemTypeEnum.videos) {
    heading = t('shared.noVideos');
    type = 'Record';
    typeTranslated = t('shared.videoOrTranslationVideo');
    taking = 'recording videos';
    imagePath = '/images/emptyItems/novideos.svg';
  } else if (emptyType === ItemTypeEnum.images) {
    heading = t('shared.noImages');
    type = 'Capture';
    typeTranslated = t('shared.videoOrTranslationImage');
    taking = 'taking screenshots now';
    imagePath = '/images/emptyItems/noimage.svg';
  }
  return (
    <div className="tw-flex tw-flex-col tw-items-center">
      <AppSvg path={imagePath} className="tw-w-max" />
      <h2 className="tw-text-2xl tw-mt-7 tw-mb-2 tw-font-semibold">
        {heading}
      </h2>
      <p className="tw-text-center">
        {type == 'a video or screenshot' ? (
          t('shared.sharedWithOthers')
        ) : (
          <>
            <Trans
              values={{ taking: taking, type: typeTranslated }}
              i18nKey="shared.videoOrScreenShot"
              components={{
                1: <b />,
              }}
            />
            {/* Start {taking}. Click the <b>{type}</b> button */}
          </>
        )}

        <br />
        {type == 'a video or screenshot'
          ? t('shared.willBeDisplayed')
          : t('shared.extensionMenu')}
      </p>
    </div>
  );
};

export default EmptyScreenshotsOrVideos;
