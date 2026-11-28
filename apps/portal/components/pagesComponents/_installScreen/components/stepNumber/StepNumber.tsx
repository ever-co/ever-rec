import classnames from 'classnames';
import React from 'react';

interface IStepNUmberProps {
  step: number;
  hasNextStep: boolean;
}

const circle =
  'tw-flex tw-size-12 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-solid tw-text-sm tw-font-medium tw-tabular-nums';
// The step the person is on, and the other one of the pair.
const current = 'tw-border-foreground tw-text-foreground';
const other = 'tw-border-border tw-text-muted-foreground';

const StepNumber: React.FC<IStepNUmberProps> = ({ step, hasNextStep }) => {
  return (
    <div className="tw-mt-8 tw-flex tw-w-full tw-justify-center">
      <div className={classnames(circle, hasNextStep ? current : other)}>
        <div>{hasNextStep ? step : step - 1}</div>
      </div>

      <div className="tw-mt-6 tw-w-14 tw-border-0 tw-border-t tw-border-solid tw-border-border"></div>

      <div className={classnames(circle, hasNextStep ? other : current)}>
        <div>{hasNextStep ? step + 1 : step}</div>
      </div>
    </div>
  );
};

export default StepNumber;
