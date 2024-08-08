import React, { ReactElement, useState } from 'react';
import classNames from 'classnames';

interface ICaptureRecordBtn {
  title: string;
  icon: ReactElement;
  iconColor?: string;
  color?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const CaptureRecordBtn: React.FC<ICaptureRecordBtn> = ({
  title,
  icon,
  color = 'tw-bg-secondary',
  active,
  disabled = false,
  onClick,
}) => {
  const [hoverBorder, setHoverBorder] = useState('tw-border-transparent');

  const clickHandler = () => {
    !active && onClick();
  };

  return (
    <div
      onMouseEnter={() =>
        setHoverBorder(disabled ? '' : 'tw-border-primary-purple')
      }
      onMouseLeave={() => setHoverBorder('tw-border-transparent')}
      className={classNames(
        'tw-w-28 tw-h-24 tw-rounded-lg tw-flex tw-flex-col tw-cursor-pointer tw-p-1 tw-justify-center tw-select-none',
        color,
        disabled && 'tw-opacity-40',
      )}
      onClick={clickHandler}
    >
      <div
        className={classNames(
          'tw-rounded-full tw-w-full tw-h-12 tw-flex tw-items-center tw-justify-center',
        )}
      >
        {icon}
      </div>
      <div
        className={classNames(
          'tw-py-1 tw-flex tw-items-center tw-pb-2 tw-border-b-4 ',
          active && !disabled ? 'tw-border-primary-purple' : hoverBorder,
        )}
      >
        <div className="tw-w-full tw-leading-none tw-font-semibold tw-text-sm tw-text-center">
          {title}
        </div>
      </div>
    </div>
  );
};

export default CaptureRecordBtn;
