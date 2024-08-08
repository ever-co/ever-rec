import React from 'react';
import classNames from 'classnames';
import { Tooltip } from 'antd';
import styles from './popupButton.module.scss';

interface IIconBtn {
  key: number;
  iconSrc: string;
  onSelect?: () => void;
  disabled?: boolean;
  tooltipTitle?: string;
}

const PopupButton: React.FC<IIconBtn> = ({
  iconSrc,
  onSelect,
  key,
  disabled,
  tooltipTitle: tooltipTitle,
}) => {
  return (
    <div className={styles.tooltipWrapper}>
      <Tooltip title={tooltipTitle} style={{ cursor: 'pointer !important' }}>
        <button
          disabled={disabled}
          key={key}
          className={classNames(
            `tw-flex tw-items-center tw-justify-center tw-w-70px tw-h-70px   tw-bg-white tw-p-4 tw-mr-4 tw-rounded-lg tw-transition-all tw-duration-300 tw-border-solid tw-border-2 tw-border-white`,
            disabled
              ? 'tw-grayscale tw-opacity-75 hover:tw-cursor-pointer hover:tw-shadow-lg hover:tw-bg-sub-btn'
              : 'tw-grayscale-0 hover:tw-cursor-pointer hover:tw-shadow-lg hover:tw-bg-sub-btn',
            styles.button,
          )}
          onClick={onSelect}
        >
          <img
            src={iconSrc}
            style={{ width: '100%', maxWidth: 'auto !important' }}
          />
        </button>
      </Tooltip>
    </div>
  );
};

export default PopupButton;
