import classNames from 'classnames';
import React, { MouseEvent, ReactNode } from 'react';

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
  twPadding?: string;
  twRounded?: string;
  onMouseEnter?: (e: any) => void;
  onMouseLeave?: (e: any) => void;
  id?: any;
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
  twTextSize,
  twTextColor,
  twPadding,
  onMouseEnter,
  twRounded,
  onMouseLeave,
  id,
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
      ? 'default:tw-opacity-50'
      : outlined
        ? 'default:hover:tw-bg-opacity-20'
        : 'default:hover:tw-bg-opacity-100';
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
        full ? 'tw-w-full' : 'tw-w-max',
        outlined ? 'tw-bg-app-grey' : bgColor,
        darkBgColor,
        twPadding ? twPadding : 'tw-py-2 tw-px-5',
        className,
        twRounded ? twRounded : 'tw-rounded-md',
        calculateBorderColor(),
        calculateDisabledClasses(),
      )}
      onClick={clickHandler}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
