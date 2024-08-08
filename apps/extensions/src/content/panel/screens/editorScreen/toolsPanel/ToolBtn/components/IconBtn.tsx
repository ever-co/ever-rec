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
  return (
    <button disabled={disabled} onClick={onSelect} id={id}>
      <label
        className={classNames(
          `tw-cursor-pointer  tw-text-app-grey tw-flex`,
          className1,
        )}
        htmlFor={actual}
      >
        <img
          alt={''}
          style={{}}
          width={size}
          height={size}
          className={classNames(`tw-m-2px`, className)}
          src={icon}
        />
      </label>
    </button>
  );
};

export default IconBtn;
