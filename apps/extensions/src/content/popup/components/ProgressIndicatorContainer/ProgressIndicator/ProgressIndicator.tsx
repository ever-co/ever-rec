import { FC, ReactNode } from 'react';
import { CircularProgressbarWithChildren } from 'react-circular-progressbar';
import { IProgressIndicatorData } from '../../../utilities/interfaces/IProgressIndicatorData';
import getPercentageFromRange from '@/content/utilities/scripts/getPercentageFromRange';
import styles from './ProgressIndicator.module.scss';

interface IProgressIndicatorProps {
  title: string;
  progressData: IProgressIndicatorData;
  children: ReactNode;
}

const ProgressIndicator: FC<IProgressIndicatorProps> = ({
  progressData,
  title,
  children,
}) => {
  const value = progressData.value;
  const maxValue = progressData.maxValue;
  const percentage = getPercentageFromRange(value, maxValue);

  return (
    <div className={styles.progressIndicatorContainer}>
      <h1 className={styles.progressTitle}>{title}</h1>
      <div className={styles.progressWrapper}>
        <CircularProgressbarWithChildren
          value={value}
          minValue={0}
          maxValue={maxValue}
          strokeWidth={9}
          styles={{
            path: {
              stroke: '#5b4dbe',
            },
            trail: {
              stroke: '#cdc9eb',
            },
            text: {
              fontWeight: 'bold',
              fill: 'black',
            },
          }}
        >
          <h1 className={styles.progressText}>{`${percentage}%`}</h1>
        </CircularProgressbarWithChildren>
      </div>
      {children}
    </div>
  );
};

export default ProgressIndicator;