import { cn } from 'app/utilities/cn';
import React, { KeyboardEvent, MouseEvent, ReactNode } from 'react';

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
  /** Accessible name for buttons that only contain an icon. */
  ariaLabel?: string;
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
  ariaLabel,
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

  // The control is a div, so keyboard activation has to be added by hand: Enter and Space press
  // it like a native button. Only react to keys pressed on the button itself, not on controls
  // nested inside it. Re-using the native click keeps the handler's event type unchanged.
  const keyDownHandler = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.target !== e.currentTarget) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;

    e.preventDefault(); // stops Space from scrolling the page
    e.currentTarget.click();
  };

  const textColor =
    bgColor === DEFAULT_BG_COLOR && !outlined && 'tw-text-white';

  return (
    <div
      id={id}
      className={cn(
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
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
      onClick={clickHandler}
      onKeyDown={keyDownHandler}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={cn(
          'tw-flex tw-items-center tw-justify-center tw-font-semibold',
          twTextColor || textColor,
          twTextSize,
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default AppButton;
