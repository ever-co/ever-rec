import { FC } from 'react';
import {
  IProgressIndicatorData,
  ProgressTypeEnum,
} from '../../utilities/interfaces/IProgressIndicatorData';
import ProgressIndicator from './ProgressIndicator/ProgressIndicator';
import { Trans, useTranslation } from 'react-i18next';

interface IProgressIndicatorContainerProps {
  progressData: IProgressIndicatorData;
}

const ProgressIndicatorContainer: FC<IProgressIndicatorContainerProps> = ({
  progressData,
}) => {
  const { t } = useTranslation();
  let title: string;
  let description: JSX.Element;

  if (progressData.progressType === ProgressTypeEnum.GIF) {
    title = t('ext.encodingGIF');
    description = (
      <span>
        <Trans
          i18nKey="ext.GIFanimation"
          components={{
            b: <b />,
          }}
        />
      </span>
    );
  } else {
    title = t('ext.fullPage');
    description = (
      <span>
        <Trans
          i18nKey="ext.scroll"
          components={{
            b: <b />,
          }}
        />
      </span>
    );
  }

  return (
    <ProgressIndicator title={title} progressData={progressData}>
      {description}
    </ProgressIndicator>
  );
};

export default ProgressIndicatorContainer;
