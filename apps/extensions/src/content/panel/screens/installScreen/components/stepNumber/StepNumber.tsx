import classnames from 'classnames';
import React from 'react';

interface IStepNUmberProps {
  step: number;
  hasNextStep: boolean;
}

const StepNumber: React.FC<IStepNUmberProps> = ({ step, hasNextStep }) => {
  return (
    <div className="tw-flex tw-justify-center tw-w-96 tw-mt-8">
      <div
        className={classnames(
          'tw-flex tw-items-center tw-justify-center tw-w-12 tw-h-12 tw-rounded-full tw-border tw-border-dark-blue tw-border-solid tw-font-bold',
          !hasNextStep && 'tw-opacity-40',
        )}
      >
        <div>{hasNextStep ? step : step - 1}</div>
      </div>

      <div
        className="tw-border-t-2 tw-border-dark-blue tw-w-14 tw-opacity-40"
        style={{ marginTop: '1.4rem' }}
      ></div>

      <div
        className={classnames(
          'tw-flex tw-items-center tw-justify-center tw-w-12 tw-h-12 tw-rounded-full tw-border tw-border-dark-blue tw-border-solid tw-font-bold',
          hasNextStep && 'tw-opacity-40',
        )}
      >
        <div>{hasNextStep ? step + 1 : step}</div>
      </div>
    </div>
  );
};

export default StepNumber;
