/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */

import React from 'react';
import classNames from 'classnames';
import styles from './popupButton.module.scss';
import { Tooltip } from 'antd';

interface IIconBtn {
  key: number;
  iconSrc: string;
  onSelect?: () => void;
  tooltipTitle?: string;
  disabled?: boolean;
  /** For a mark drawn in a single dark ink, so it can follow the theme (brand marks get none). */
  iconClassName?: string;
}

const PopupButton: React.FC<IIconBtn> = ({
  iconSrc,
  onSelect,
  tooltipTitle,
  key,
  disabled,
  iconClassName,
}) => {
  return (
    <Tooltip title={tooltipTitle}>
      <button
        disabled={disabled}
        key={key}
        className={classNames(
          styles.buttonContainer,
          disabled ? styles.disabled : styles.enabled,
        )}
        onClick={onSelect}
      >
        <img
          src={iconSrc}
          className={iconClassName}
          style={{ width: '100%', maxWidth: 'auto !important' }}
        />
      </button>
    </Tooltip>
  );
};

export default PopupButton;
