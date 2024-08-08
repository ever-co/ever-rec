import { FC } from 'react';
import {
  IProgressIndicatorData,
  ProgressTypeEnum,
} from '../../utilities/interfaces/IProgressIndicatorData';
import ProgressIndicator from './ProgressIndicator/ProgressIndicator';

interface IProgressIndicatorContainerProps {
  progressData: IProgressIndicatorData;
}

const ProgressIndicatorContainer: FC<IProgressIndicatorContainerProps> = ({
  progressData,
}) => {
  let title: string;
  let description: JSX.Element;

  if (progressData.progressType === ProgressTypeEnum.GIF) {
    title = 'Encoding GIF Animation';
    description = (
      <span>
        Your <b>GIF animation</b> is currently encoding...
      </span>
    );
  } else {
    title = 'Full Page Capturing';
    description = (
      <span>
        Please <b>do not scroll</b> for the best possible result.
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
