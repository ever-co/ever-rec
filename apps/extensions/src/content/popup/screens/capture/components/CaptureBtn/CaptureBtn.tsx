import React, { ReactElement } from 'react';
import classNames from 'classnames';
import { Tooltip } from 'antd';
import { TooltipPlacement } from 'antd/lib/tooltip';

interface ICaptureBtn {
  title: string;
  icon: ReactElement;
  color?: string;
  disabled?: boolean;
  disabledTooltipPlacement?: TooltipPlacement;
  onClick: () => void;
}

const CaptureBtn: React.FC<ICaptureBtn> = ({
  title,
  icon,
  color = 'tw-bg-secondary',
  disabled,
  disabledTooltipPlacement = 'bottom',
  onClick,
}) => {
  const clickHandler = () => {
    !disabled && onClick();
  };

  return (
    <Tooltip
      placement={disabledTooltipPlacement}
      title={
        disabled &&
        'This action is not available on this page due to browser restrictions.'
      }
    >
      <div
        className={classNames(
          disabled && 'tw-opacity-40',
          'tw-w-28 tw-h-24 tw-rounded-lg tw-flex tw-flex-col tw-cursor-pointer tw-p-1 tw-justify-center hover:tw-bg-blue-grey',
          color,
        )}
        onClick={clickHandler}
      >
        <div
          className={classNames(
            'tw-rounded-full tw-w-full tw-h-12 tw-flex tw-items-center tw-justify-center tw-bg-opacity-50',
          )}
        >
          {icon}
        </div>
        <div className="tw-py-1 tw-flex tw-items-center">
          <div className="tw-w-full tw-leading-none tw-font-semibold tw-text-sm tw-text-center">
            {title}
          </div>
        </div>
      </div>
    </Tooltip>
  );
};

export default CaptureBtn;
