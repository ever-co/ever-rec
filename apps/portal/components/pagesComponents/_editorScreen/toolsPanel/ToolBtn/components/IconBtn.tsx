/* eslint-disable jsx-a11y/alt-text */
import Image from 'next/legacy/image';
import React from 'react';
import classNames from 'classnames';

interface IIconBtn {
  id?: string;
  icon: string;
  size?: string;
  onSelect?: () => void;
  className?: string;
  className1?: string;
  actual?: string;
  disabled?: boolean;
}

const IconBtn: React.FC<IIconBtn> = ({
  id,
  icon,
  onSelect,
  size,
  className,
  className1,
  actual,
  disabled,
}) => {
  size = size?.replace('px', '');

  return (
    <button disabled={disabled} onClick={onSelect} id={id}>
      <label
        className={className1}
        style={{ cursor: 'pointer', color: '#a1a1a1', display: 'flex' }}
        htmlFor={actual}
      >
        <Image
          style={{ marginLeft: '5px', marginRight: '5px' }}
          width={`${+(size || 0)}`}
          height={`${+(size || 0)}`}
          className={className}
          src={icon}
          alt="icon"
        />
      </label>
    </button>
  );
};

export default IconBtn;
