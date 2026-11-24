import React, { CSSProperties, FocusEvent, KeyboardEvent } from 'react';

interface IControllerButtonProps {
  className: string;
  imgSource: string;
  subFoldersWithPrefix?: string;
  onClick: () => void;
  onMouse?: () => void;
  outMouse?: () => void;
  disabled?: boolean;
  /** Accessible name announced by screen readers (the icon itself has no text). */
  label?: string;
  /** Set for toggle buttons (e.g. pen on/off) so the state is announced. */
  pressed?: boolean;
  onFocus?: (event: FocusEvent<HTMLDivElement>) => void;
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
  /** Runs on every key press, before Enter or Space activate the button. */
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
}

const ControllerButton: React.FC<IControllerButtonProps> = ({
  className,
  imgSource,
  subFoldersWithPrefix = '',
  onClick,
  onMouse,
  outMouse,
  disabled,
  label,
  pressed,
  onFocus,
  onBlur,
  onKeyDown,
}) => {
  let disabledStyles: CSSProperties = {};
  if (disabled) {
    disabledStyles = {
      opacity: '0.70',
      cursor: 'default',
    };
  }

  const clickHandler = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const keyDownHandler = (event: KeyboardEvent<HTMLDivElement>) => {
    if (onKeyDown) {
      onKeyDown(event);
    }
    if (event.key === 'Enter' || event.key === ' ') {
      // Space would otherwise scroll the host page.
      event.preventDefault();
      // A held key repeats keydown. Act on the first one only, so pause and pen
      // do not flip back and forth.
      if (event.repeat) {
        return;
      }
      clickHandler();
    }
  };

  const onMouseHandler = () => {
    if (onMouse) {
      onMouse();
    }
  };

  const outMouseHandler = () => {
    if (outMouse) {
      outMouse();
    }
  };

  return (
    <div
      className={className}
      style={disabledStyles}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled ? true : undefined}
      aria-pressed={pressed}
      onClick={clickHandler}
      onKeyDown={keyDownHandler}
      onFocus={onFocus}
      onBlur={onBlur}
      onMouseOver={onMouseHandler}
      onMouseLeave={outMouseHandler}
    >
      <img
        src={chrome.runtime.getURL(
          `./images/contentImages${subFoldersWithPrefix}/${imgSource}`,
        )}
        alt=""
      />
    </div>
  );
};

export default ControllerButton;
