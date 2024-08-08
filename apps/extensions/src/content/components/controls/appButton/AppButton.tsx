import classNames from 'classnames';
import React, { CSSProperties, MouseEvent, ReactNode } from 'react';

const DEFAULT_BG_COLOR = 'tw-bg-primary-purple';

interface AppInputProps {
  onClick: (e: any) => void;
  children: ReactNode;
  disabled?: boolean;
  bgColor?: string;
  darkBgColor?: string;
  outlined?: boolean;
  className?: string;
  full?: boolean;
  twTextSize?: string;
  twTextColor?: string;
  twRounded?: string;
  twPadding?: string;
  onMouseEnter?: (e: any) => void;
  onMouseLeave?: (e: any) => void;
  id?: any;
  style?: CSSProperties;
  disableWMax?: boolean;
}

const AppButton: React.FC<AppInputProps> = ({
  onClick,
  children,
  disabled,
  bgColor = DEFAULT_BG_COLOR,
  darkBgColor,
  outlined,
  className,
  full,
  twRounded,
  twTextSize,
  twTextColor,
  twPadding,
  onMouseEnter,
  onMouseLeave,
  id,
  style,
  disableWMax = false,
}) => {
  const calculateBorderColor = () => {
    const border = `tw-border`;

    if (outlined) {
      return `tw-bg-opacity-0 ${border} tw-border-app-grey-darker`;
    }

    return `${border} tw-border-transparent`;
  };

  const calculateDisabledClasses = () => {
    return disabled
      ? 'tw-opacity-50'
      : outlined
      ? 'hover:tw-bg-opacity-20'
      : 'hover:tw-bg-opacity-100';
  };

  const clickHandler = (e: MouseEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    !disabled && onClick(e);
  };

  const textColor =
    bgColor === DEFAULT_BG_COLOR && !outlined && 'tw-text-white';

  return (
    <div
      id={id}
      className={classNames(
        'tw-cursor-pointer tw-select-none tw-text-base',
        full ? 'tw-w-full' : disableWMax ? '' : 'tw-w-max',
        outlined ? 'tw-bg-app-grey' : bgColor,
        darkBgColor,
        twPadding ? twPadding : 'tw-py-2 tw-px-5',
        twRounded ? twRounded : 'tw-rounded-md',
        className,
        calculateBorderColor(),
        calculateDisabledClasses(),
      )}
      style={style}
      onClick={clickHandler}
    >
      <div
        className={classNames(
          'tw-flex tw-items-center tw-justify-center tw-font-semibold',
          textColor,
          twTextColor,
          twTextSize,
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default AppButton;
