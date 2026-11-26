import { cn } from 'app/utilities/cn';
import React, { KeyboardEvent, MouseEvent, ReactNode } from 'react';

const DEFAULT_BG_COLOR = 'tw-bg-primary-purple';

type Look = 'primary' | 'destructive' | 'surface' | 'ghost' | 'neutral';

// Callers choose a look through `bgColor` (a Tailwind class, sometimes a bare colour that never
// painted anything). The values in use map onto the Ever button variants, so every caller follows
// the theme without being edited.
const LOOK_OF_BG: Record<string, Look> = {
  [DEFAULT_BG_COLOR]: 'primary',
  'tw-bg-whiteboard-purple': 'primary',
  '#5b4dbe': 'primary',
  'tw-bg-danger': 'destructive',
  'tw-bg-red': 'destructive',
  '#FF2116': 'destructive',
  'tw-bg-white': 'surface',
  white: 'surface',
  'tw-bg-transparent': 'ghost',
  'tw-bg-app-grey-darker': 'neutral',
  '#636366': 'neutral',
};

const LOOK_CLASSES: Record<Look, { ground: string; text: string }> = {
  primary: {
    ground: 'tw-bg-primary hover:tw-bg-primary/90',
    text: 'tw-text-primary-foreground',
  },
  destructive: {
    ground: 'tw-bg-destructive hover:tw-bg-destructive/90',
    text: 'tw-text-destructive-foreground',
  },
  surface: {
    ground: 'tw-bg-card !tw-border-input hover:tw-bg-accent',
    text: 'tw-text-foreground',
  },
  ghost: {
    ground: 'tw-bg-transparent hover:tw-bg-accent',
    text: 'tw-text-foreground',
  },
  neutral: {
    ground: 'tw-bg-secondary hover:tw-bg-accent',
    text: 'tw-text-secondary-foreground',
  },
};

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
  // A look this component knows, or the caller's own class (then the caller owns the colours).
  const look: Look | undefined = LOOK_OF_BG[bgColor];
  const ground = outlined
    ? 'tw-bg-transparent !tw-border-input hover:tw-bg-accent'
    : look
      ? LOOK_CLASSES[look].ground
      : bgColor;

  const clickHandler = (e: MouseEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    !disabled && onClick(e);
  };

  // The control is a div, so keyboard activation has to be added by hand and mirror a native
  // button: Enter activates on key down, Space on key up. Neither repeats while the key is held
  // (a held key must not send a request again and again). Only react to keys pressed on the
  // button itself, not on controls nested inside it. Re-using the native click keeps the
  // handler's event type unchanged.
  const keyDownHandler = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.target !== e.currentTarget) return;

    if (e.key === ' ') {
      e.preventDefault(); // stops Space from scrolling the page; activation waits for key up
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!e.repeat) e.currentTarget.click();
    }
  };

  const keyUpHandler = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.target !== e.currentTarget || e.key !== ' ') return;

    e.preventDefault();
    e.currentTarget.click();
  };

  const textColor = outlined
    ? 'tw-text-foreground'
    : look && LOOK_CLASSES[look].text;

  return (
    <div
      id={id}
      className={cn(
        'tw-select-none tw-border tw-border-solid tw-border-transparent tw-text-sm tw-transition-colors tw-duration-150',
        disabled ? 'tw-cursor-not-allowed tw-opacity-50' : 'tw-cursor-pointer',
        // styles.scss sets `.rec-next div:focus { outline: none }` on every div, which hides the
        // browser's focus ring. Keyboard focus needs its own outline, marked important to win.
        'focus-visible:!tw-outline focus-visible:!tw-outline-2 focus-visible:!tw-outline-offset-2 focus-visible:!tw-outline-primary-purple',
        full ? 'tw-w-full' : 'tw-w-max',
        ground,
        darkBgColor,
        twPadding ? twPadding : 'tw-py-2 tw-px-4',
        className,
        twRounded ? twRounded : 'tw-rounded-md',
      )}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
      onClick={clickHandler}
      onKeyDown={keyDownHandler}
      onKeyUp={keyUpHandler}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={cn(
          'tw-flex tw-items-center tw-justify-center tw-gap-2 tw-font-medium',
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
