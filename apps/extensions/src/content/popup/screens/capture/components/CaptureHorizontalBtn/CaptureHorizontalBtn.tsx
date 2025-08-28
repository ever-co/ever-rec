import React, { ReactElement, useState } from 'react';
import classNames from 'classnames';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

interface ICaptureHorizontalBtnProps {
  title: string;
  icon: ReactElement;
  color?: string;
  disabled?: boolean;
  onClick: () => void;
}

const CaptureHorizontalBtn: React.FC<ICaptureHorizontalBtnProps> = ({
  title,
  icon,
  color = 'tw-bg-secondary',
  disabled,
  onClick,
}) => {
  const [hover, setHover] = useState('');
  const { t } = useTranslation();

  const clickHandler = () => {
    !disabled && onClick();
  };

  return (
    <Tooltip
      placement="topLeft"
      title={disabled && t('ext.errors.browserRestrictions')}
    >
      <div
        className={classNames(
          disabled && 'tw-opacity-40',
          'tw-flex tw-items-center tw-w-full tw-px-3 tw-py-2 tw-rounded-lg tw-cursor-pointer tw-bg-white dark:tw-bg-section-black hover:tw-bg-blue-grey',
        )}
        onMouseEnter={() => setHover('tw-bg-dark-grey')}
        onMouseLeave={() => setHover('')}
        onClick={clickHandler}
      >
        <div
          className={classNames(
            color,
            'tw-flex tw-items-center tw-justify-center tw-w-12 tw-h-12 tw-mr-5 tw-rounded-full',
            hover,
          )}
        >
          {icon}
        </div>
        <div className="tw-px-1 tw-flex">
          <div className="tw-w-full tw-leading-none tw-font-semibold tw-text-sm">
            {title}
          </div>
        </div>
      </div>
    </Tooltip>
  );
};

export default CaptureHorizontalBtn;
